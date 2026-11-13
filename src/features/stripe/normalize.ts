import { createHash } from "node:crypto";

// Objets Stripe → lignes de nos tables (fonctions pures, testées). Seuls les champs utiles sont
// lus ; tout le reste de l'objet Stripe est ignoré.

type Price = {
  unit_amount?: number | null;
  unit_amount_decimal?: string | null;
  nickname?: string | null;
  product?: string | { name?: string | null } | null;
  recurring?: { interval?: string; interval_count?: number } | null;
};
type Item = { quantity?: number | null; price?: Price | null; current_period_end?: number | null };
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

/** Revenu mensuel d'une ligne d'abonnement, en centimes (annuel ÷ 12, quantité comprise). */
export function monthlyCents(item: Item) {
  const price = item.price;
  const interval = price?.recurring?.interval;
  if (!price || !interval || !(interval in MONTHS)) return 0;
  const unit = price.unit_amount ?? Number(price.unit_amount_decimal ?? 0);
  const months = MONTHS[interval] * (price.recurring?.interval_count || 1);
  return (unit * (item.quantity ?? 1)) / months;
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

/**
 * Le nom de l'offre vient du produit : lu à part (liste des produits), car Stripe limite le
 * dépliage des objets à 4 niveaux (data.items.data.price.product en ferait 5).
 */
export function toSubscriptionRow(
  projectId: string,
  subscription: StripeSubscription,
  productNames: Map<string, string> = new Map(),
  /** Expiration de la carte par défaut de chaque client (customerCards). */
  cards: Map<string, string> = new Map(),
) {
  const items = subscription.items?.data ?? [];
  const interval = items[0]?.price?.recurring?.interval;
  const customerId = idOf(subscription.customer)!;
  const product = items[0]?.price?.product;
  const productName =
    typeof product === "object" ? product?.name : product ? productNames.get(product) : null;
  return {
    project_id: projectId,
    id: subscription.id,
    customer_id: customerId,
    status: subscription.status,
    mrr_cents: Math.round(items.reduce((sum, item) => sum + monthlyCents(item), 0)),
    currency: subscription.currency ?? "eur",
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

export function toInvoiceRow(projectId: string, invoice: StripeInvoice) {
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
  };
}
