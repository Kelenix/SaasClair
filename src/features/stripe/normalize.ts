import { createHash } from "node:crypto";

// Objets Stripe → lignes de nos tables (fonctions pures, testées). Seuls les champs utiles sont
// lus ; tout le reste de l'objet Stripe est ignoré.

type Price = {
  unit_amount?: number | null;
  unit_amount_decimal?: string | null;
  nickname?: string | null;
  product?: string | { name?: string | null } | null;
  /** « tiered » : prix par paliers, que le prix seul ne permet pas de calculer. */
  billing_scheme?: string | null;
  recurring?: { interval?: string; interval_count?: number; usage_type?: string | null } | null;
};
type Item = { quantity?: number | null; price?: Price | null; current_period_end?: number | null };

/** Bon de réduction Stripe : pourcentage ou montant par facture, pour une durée donnée. */
export type StripeCoupon = {
  id: string;
  percent_off?: number | null;
  amount_off?: number | null;
  /** once (première facture seulement), repeating (quelques mois) ou forever. */
  duration?: string | null;
};
/** Remise posée sur un abonnement (structure ancienne : coupon ; récente : source.coupon). */
type Discount =
  | string
  | {
      coupon?: StripeCoupon | string | null;
      source?: { coupon?: StripeCoupon | string | null } | null;
      end?: number | null;
    };
/** Moyen de paiement déplié (expand) : seul le mois d'expiration de la carte est lu. */
type PaymentMethod = string | { card?: { exp_month?: number; exp_year?: number } | null } | null;

export type StripeCustomer = {
  id: string;
  name?: string | null;
  email?: string | null;
  created: number;
  deleted?: boolean;
  invoice_settings?: { default_payment_method?: PaymentMethod } | null;
};
export type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  currency?: string;
  created: number;
  canceled_at?: number | null;
  ended_at?: number | null;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  trial_end?: number | null;
  current_period_end?: number | null;
  items?: { data?: Item[] };
  default_payment_method?: PaymentMethod;
  /** Remises dépliées (expand data.discounts) ; l'ancienne API n'en porte qu'une. */
  discounts?: Discount[] | null;
  discount?: Discount | null;
};
/** Ligne de facture : l'ancienne API dit type et proration, la récente les range dans parent. */
type InvoiceLine = {
  amount?: number;
  type?: string;
  proration?: boolean;
  parent?: {
    type?: string;
    subscription_item_details?: { proration?: boolean | null } | null;
  } | null;
  discount_amounts?: { amount?: number }[] | null;
  period?: { start?: number; end?: number } | null;
};
export type StripeInvoice = {
  id: string;
  customer?: string | { id: string } | null;
  subscription?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  status?: string | null;
  amount_due?: number;
  amount_paid?: number;
  currency?: string;
  attempt_count?: number;
  created: number;
  next_payment_attempt?: number | null;
  lines?: { data?: InvoiceLine[] } | null;
};

const iso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;
const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? null);

/**
 * Fin du mois d'expiration d'une carte (une carte « 11/26 » marche jusqu'au 30 novembre 2026
 * inclus), ou null si ce n'est pas une carte dépliée.
 */
export function cardExpiresAt(method: PaymentMethod | undefined) {
  const card = typeof method === "object" ? method?.card : null;
  if (!card?.exp_month || !card.exp_year) return null;
  return new Date(Date.UTC(card.exp_year, card.exp_month, 1)).toISOString();
}

/** Carte de paiement par défaut de chaque client (expiration seulement). */
export const customerCards = (customers: StripeCustomer[]) =>
  new Map(
    customers.flatMap((customer) => {
      const expires = cardExpiresAt(customer.invoice_settings?.default_payment_method);
      return expires ? [[customer.id, expires] as const] : [];
    }),
  );

export const emailHash = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

/** Mois par période de facturation. */
const MONTHS: Record<string, number> = { day: 12 / 365, week: 12 / 52, month: 1, year: 12 };

/** Nombre de mois couverts par une période de facturation. */
const monthsOf = (price: Price | null | undefined) => {
  const interval = price?.recurring?.interval;
  return interval && interval in MONTHS
    ? MONTHS[interval] * (price?.recurring?.interval_count || 1)
    : null;
};

/**
 * Revenu mensuel d'une ligne d'abonnement, en centimes (annuel ÷ 12, quantité comprise).
 * Null quand le prix seul ne le dit pas (paliers, facturation à l'usage) : le revenu de ces
 * abonnements est alors lu sur leur dernière facture (metrics.ts).
 */
export function monthlyCents(item: Item): number | null {
  const price = item.price;
  const months = monthsOf(price);
  if (!price || months === null) return 0;
  if (price.billing_scheme === "tiered" || price.recurring?.usage_type === "metered") return null;
  const unit = price.unit_amount ?? Number(price.unit_amount_decimal ?? 0);
  return (unit * (item.quantity ?? 1)) / months;
}

/** Bons de réduction encore actifs d'un abonnement (« once » : première facture seulement). */
function activeCoupons(
  subscription: StripeSubscription,
  coupons: Map<string, StripeCoupon>,
  now: number,
) {
  const discounts = subscription.discounts?.length
    ? subscription.discounts
    : subscription.discount
      ? [subscription.discount]
      : [];
  return discounts.flatMap((discount) => {
    if (typeof discount === "string") return [];
    if (discount.end && discount.end * 1000 <= now) return [];
    const ref = discount.coupon ?? discount.source?.coupon;
    const coupon = typeof ref === "string" ? coupons.get(ref) : ref;
    return coupon && coupon.duration !== "once" ? [coupon] : [];
  });
}

/**
 * Revenu mensuel après remises : pourcentages d'abord, puis montants fixes (par facture, ramenés
 * au mois). Jamais négatif.
 */
export function discountedCents(cents: number, coupons: StripeCoupon[], months: number) {
  let total = cents;
  for (const coupon of coupons) {
    if (coupon.percent_off) total *= 1 - coupon.percent_off / 100;
  }
  for (const coupon of coupons) {
    if (coupon.amount_off) total -= coupon.amount_off / months;
  }
  return Math.max(0, total);
}

export function toCustomerRow(projectId: string, customer: StripeCustomer) {
  const email = customer.email?.trim().slice(0, 320) || null;
  return {
    project_id: projectId,
    id: customer.id,
    name: customer.name?.trim().slice(0, 200) || null,
    email,
    email_hash: email ? emailHash(email) : null,
    created_at: iso(customer.created)!,
  };
}

export type StripeProduct = { id: string; name?: string | null };

/** Événement Stripe (journal /v1/events ou notification) : seul l'objet concerné est lu. */
export type StripeEvent = {
  id: string;
  type: string;
  account?: string;
  data?: { object?: { id?: string; customer?: string | { id: string } | null } | null } | null;
};

/** Identifiant Stripe sûr à placer dans une adresse (lettres, chiffres, « _ »). */
const SAFE_ID = /^[A-Za-z0-9_]{3,255}$/;

/**
 * Objets à relire après une série d'événements, sans doublon. Un client dont la carte ou les
 * réglages changent fait relire ses abonnements (la carte de secours de chacun).
 */
export function changesOf(events: StripeEvent[]) {
  const customers = new Set<string>();
  const subscriptionsOf = new Set<string>();
  const subscriptions = new Set<string>();
  const invoices = new Set<string>();
  const deletedCustomers = new Set<string>();
  for (const event of events) {
    const object = event.data?.object;
    const id = object?.id;
    if (!id || !SAFE_ID.test(id)) continue;
    if (event.type === "customer.deleted") deletedCustomers.add(id);
    else if (event.type.startsWith("customer.subscription.")) subscriptions.add(id);
    else if (event.type === "customer.created") customers.add(id);
    else if (event.type === "customer.updated") subscriptionsOf.add(id);
    else if (event.type.startsWith("invoice.")) invoices.add(id);
    else if (event.type.startsWith("payment_method.")) {
      const customer = idOf(object.customer);
      if (customer && SAFE_ID.test(customer)) subscriptionsOf.add(customer);
    }
  }
  for (const id of deletedCustomers) {
    customers.delete(id);
    subscriptionsOf.delete(id);
  }
  return {
    customers,
    subscriptionsOf,
    subscriptions,
    invoices,
    deletedCustomers,
    total:
      customers.size +
      subscriptionsOf.size +
      subscriptions.size +
      invoices.size +
      deletedCustomers.size,
  };
}

/**
 * Le nom de l'offre vient du produit : lu à part (liste des produits), car Stripe limite le
 * dépliage des objets à 4 niveaux (data.items.data.price.product en ferait 5).
 */
export function toSubscriptionRow(
  projectId: string,
  subscription: StripeSubscription,
  {
    productNames = new Map(),
    cards = new Map(),
    coupons = new Map(),
    now = Date.now(),
  }: {
    productNames?: Map<string, string>;
    /** Expiration de la carte par défaut de chaque client (customerCards). */
    cards?: Map<string, string>;
    /** Bons de réduction du compte, quand la remise ne les porte pas dépliés. */
    coupons?: Map<string, StripeCoupon>;
    now?: number;
  } = {},
) {
  const items = subscription.items?.data ?? [];
  const interval = items[0]?.price?.recurring?.interval;
  const amounts = items.map(monthlyCents);
  const known = amounts.reduce<number>((total, cents) => total + (cents ?? 0), 0);
  const customerId = idOf(subscription.customer)!;
  const product = items[0]?.price?.product;
  const productName =
    typeof product === "object" ? product?.name : product ? productNames.get(product) : null;
  return {
    project_id: projectId,
    id: subscription.id,
    customer_id: customerId,
    status: subscription.status,
    mrr_cents: Math.round(
      discountedCents(
        known,
        activeCoupons(subscription, coupons, now),
        monthsOf(items[0]?.price) ?? 1,
      ),
    ),
    // Paliers ou usage : revenu lu sur les factures, pas sur le prix.
    price_unknown: amounts.some((cents) => cents === null),
    currency: (subscription.currency ?? "eur").toLowerCase(),
    plan_name: (productName ?? items[0]?.price?.nickname ?? null)?.slice(0, 200) ?? null,
    created_at: iso(subscription.created)!,
    canceled_at: iso(subscription.canceled_at),
    ended_at: iso(subscription.ended_at),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    cancel_at: iso(subscription.cancel_at),
    trial_end: iso(subscription.trial_end),
    // Versions récentes de l'API : la fin de période est portée par les lignes.
    current_period_end: iso(subscription.current_period_end ?? items[0]?.current_period_end),
    billing_interval:
      interval && ["day", "week", "month", "year"].includes(interval) ? interval : null,
    // Carte propre à l'abonnement, sinon celle du client.
    card_expires_at:
      cardExpiresAt(subscription.default_payment_method) ?? cards.get(customerId) ?? null,
  };
}

const DAYS_PER_MONTH = 30.4375;

/**
 * Part récurrente d'une facture d'abonnement, ramenée au mois : lignes d'abonnement hors
 * prorata, remises déduites, sur la période qu'elles couvrent. Le nombre de mois vient de la
 * durée de la période (même sans le prix). Null si la facture n'en a pas (prorata, achat
 * ponctuel). C'est l'historique réel du revenu de chaque abonnement (expansion, contraction).
 */
export function recurringPart(invoice: StripeInvoice) {
  const lines = (invoice.lines?.data ?? []).filter((line) => {
    const subscriptionLine =
      line.type === "subscription" || line.parent?.type === "subscription_item_details";
    const proration = line.proration ?? line.parent?.subscription_item_details?.proration ?? false;
    return subscriptionLine && !proration && line.period?.start && line.period?.end;
  });
  if (!lines.length) return null;
  const start = Math.min(...lines.map((line) => line.period!.start!));
  const end = Math.max(...lines.map((line) => line.period!.end!));
  const days = (end - start) / (24 * 60 * 60);
  if (days <= 0) return null;
  // Une période d'un mois fait 28 à 31 jours : arrondie au mois entier au-delà de 25 jours.
  const months =
    days >= 25 ? Math.max(1, Math.round(days / DAYS_PER_MONTH)) : days / DAYS_PER_MONTH;
  const net = lines.reduce(
    (total, line) =>
      total +
      (line.amount ?? 0) -
      (line.discount_amounts ?? []).reduce((sum, discount) => sum + (discount.amount ?? 0), 0),
    0,
  );
  return {
    recurring_cents: Math.max(0, Math.round(net / months)),
    period_start: iso(start)!,
    period_end: iso(end)!,
  };
}

export function toInvoiceRow(projectId: string, invoice: StripeInvoice) {
  const recurring = recurringPart(invoice);
  return {
    project_id: projectId,
    id: invoice.id,
    customer_id: idOf(invoice.customer),
    subscription_id:
      idOf(invoice.subscription) ?? invoice.parent?.subscription_details?.subscription ?? null,
    status: invoice.status ?? "draft",
    amount_due_cents: invoice.amount_due ?? 0,
    amount_paid_cents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "eur",
    attempt_count: invoice.attempt_count ?? 0,
    created_at: iso(invoice.created)!,
    next_payment_attempt: iso(invoice.next_payment_attempt),
    recurring_cents: recurring?.recurring_cents ?? null,
    period_start: recurring?.period_start ?? null,
    period_end: recurring?.period_end ?? null,
  };
}
