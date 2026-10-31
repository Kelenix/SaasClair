import { createHmac, timingSafeEqual } from "node:crypto";
import { parseLookupKey } from "./plans";

// Notifications de Stripe (abonnement de SaasClair) → mise à jour du profil. Fonctions pures,
// testées ; la route /api/billing/webhook ne fait que vérifier, lire et enregistrer.

/** Signature Stripe : « t=…,v1=… » = HMAC-SHA256 de « t.corps » avec le secret du point. */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  now: Date,
  toleranceSeconds = 300,
) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((part) => part.split("=", 2) as [string, string]),
  );
  const timestamp = Number(parts.t);
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(now.getTime() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some(
    (signature) =>
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected)),
  );
}

export type BillingSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  default_payment_method?: string | { type?: string } | null;
  items?: {
    data?: {
      current_period_end?: number | null;
      price?: { lookup_key?: string | null; recurring?: { interval?: string } | null };
    }[];
  };
};

/** Statut Stripe → statut du profil (« canceled » : l'écran de choix d'offre réapparaît). */
const STATUS: Record<string, "active" | "past_due" | "canceled" | "trialing"> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  paused: "canceled",
  canceled: "canceled",
  incomplete_expired: "canceled",
};

const PAYMENT_METHOD: Record<string, "card" | "sepa" | "paypal"> = {
  card: "card",
  sepa_debit: "sepa",
  paypal: "paypal",
};

/** Champs du profil à écrire pour cet abonnement (null : abonnement étranger à SaasClair). */
export function profileUpdate(subscription: BillingSubscription) {
  const item = subscription.items?.data?.[0];
  const offer = parseLookupKey(item?.price?.lookup_key);
  if (!offer) return null;
  const method = subscription.default_payment_method;
  const end = subscription.current_period_end ?? item?.current_period_end;
  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    plan: offer.plan,
    billing_interval: offer.interval,
    subscription_status: STATUS[subscription.status] ?? "past_due",
    payment_method:
      typeof method === "object" && method?.type ? (PAYMENT_METHOD[method.type] ?? null) : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  };
}
