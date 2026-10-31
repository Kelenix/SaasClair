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

export type StripeCustomer = {
  id: string;
  name?: string | null;
  email?: string | null;
  created: number;
  deleted?: boolean;
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
  current_period_end?: number | null;
  items?: { data?: Item[] };
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

export function toSubscriptionRow(projectId: string, subscription: StripeSubscription) {
  const items = subscription.items?.data ?? [];
  const product = items[0]?.price?.product;
  return {
    project_id: projectId,
    id: subscription.id,
    customer_id: idOf(subscription.customer)!,
    status: subscription.status,
    mrr_cents: Math.round(items.reduce((sum, item) => sum + monthlyCents(item), 0)),
    currency: subscription.currency ?? "eur",
    plan_name:
      (typeof product === "object" ? product?.name : null) ??
      items[0]?.price?.nickname?.slice(0, 200) ??
      null,
    created_at: iso(subscription.created)!,
    canceled_at: iso(subscription.canceled_at),
    ended_at: iso(subscription.ended_at),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    // Versions récentes de l'API : la fin de période est portée par les lignes.
    current_period_end: iso(subscription.current_period_end ?? items[0]?.current_period_end),
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
