// Calculs de l'espace super administrateur, à partir des profils (fonctions pures, testées).

import { annualMonthlyPrice } from "@/features/marketing/pricing-math";
import { CHANNELS, type Channel } from "@/features/attribution/attribution";
import type { Database } from "@/lib/supabase/database.types";

export type AdminProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type PlanId = Database["public"]["Enums"]["plan_id"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type BillingInterval = Database["public"]["Enums"]["billing_interval"];

const DAY_MS = 86_400_000;
/** « Connecté » : vu sur le tableau de bord dans les 5 dernières minutes. */
const ONLINE_WINDOW_MS = 5 * 60_000;

export const PLAN_LABELS: Record<PlanId, string> = {
  trial: "Essai gratuit",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};
export const LIST_PRICES: Record<Exclude<PlanId, "trial" | "pro">, number> = {
  starter: 29,
  growth: 79,
};
/** Prix Pro par défaut quand aucun prix négocié n'est saisi. */
export const PRO_DEFAULT_PRICE = 249;

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "En essai",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  suspended: "Suspendu",
};
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card: "Carte bancaire",
  sepa: "Prélèvement SEPA",
  paypal: "PayPal",
  bank_transfer: "Virement",
};
export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Mensuel",
  annual: "Annuel",
};

/** Revenu mensuel d'un abonnement (annuel ramené au mois, remise de 20 % comprise). */
export function monthlyRevenue(
  profile: Pick<
    AdminProfile,
    "plan" | "billing_interval" | "custom_monthly_price" | "subscription_status"
  >,
) {
  if (!["active", "past_due"].includes(profile.subscription_status)) return 0;
  if (profile.plan === "trial") return 0;
  if (profile.plan === "pro") return profile.custom_monthly_price ?? PRO_DEFAULT_PRICE;
  const price = LIST_PRICES[profile.plan];
  return profile.billing_interval === "annual" ? annualMonthlyPrice(price) : price;
}

export const isOnline = (profile: Pick<AdminProfile, "last_seen_at">, now: Date) =>
  Boolean(
    profile.last_seen_at && now.getTime() - Date.parse(profile.last_seen_at) < ONLINE_WINDOW_MS,
  );

const isPaying = (profile: Pick<AdminProfile, "subscription_status" | "plan">) =>
  profile.subscription_status === "active" && profile.plan !== "trial";

const channelOf = (profile: Pick<AdminProfile, "signup_channel">): Channel =>
  (CHANNELS as readonly string[]).includes(profile.signup_channel)
    ? (profile.signup_channel as Channel)
    : "direct";

const countBy = <K extends string>(
  items: AdminProfile[],
  key: (item: AdminProfile) => K | null,
) => {
  const counts = new Map<K, number>();
  for (const item of items) {
    const value = key(item);
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const WEEK_LABEL = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short" });

export function summarize(all: AdminProfile[], now = new Date()) {
  // Le super administrateur n'est pas un client.
  const customers = all.filter((profile) => profile.role !== "super_admin");
  const since = (days: number) => now.getTime() - days * DAY_MS;
  const createdAt = (profile: AdminProfile) => Date.parse(profile.created_at);
  const mrr = customers.reduce((sum, profile) => sum + monthlyRevenue(profile), 0);
  const paying = customers.filter(isPaying);
  const status = (value: SubscriptionStatus) =>
    customers.filter((profile) => profile.subscription_status === value).length;

  // Essais terminés sur 90 jours : part devenue payante.
  const endedTrials = customers.filter(
    (profile) =>
      Date.parse(profile.trial_ends_at) < now.getTime() &&
      Date.parse(profile.trial_ends_at) > since(90),
  );
  const converted = endedTrials.filter((profile) => profile.plan !== "trial").length;

  const byChannel = CHANNELS.map((channel) => {
    const group = customers.filter((profile) => channelOf(profile) === channel);
    return {
      channel,
      users: group.length,
      paying: group.filter(isPaying).length,
      mrr: group.reduce((sum, profile) => sum + monthlyRevenue(profile), 0),
    };
  })
    .filter((row) => row.users > 0)
    .sort((a, b) => b.mrr - a.mrr || b.users - a.users);

  // Inscriptions des 12 dernières semaines.
  const signupsByWeek = Array.from({ length: 12 }, (_, index) => {
    const end = now.getTime() - (11 - index) * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    const group = customers.filter(
      (profile) => createdAt(profile) > start && createdAt(profile) <= end,
    );
    return {
      label: WEEK_LABEL.format(new Date(start + DAY_MS)),
      signups: group.length,
      paying: group.filter(isPaying).length,
    };
  });

  // Revenu mensuel des 6 derniers mois : abonnés actuels déjà inscrits à la fin de chaque mois
  // (approximation tant que l'historique de facturation Stripe n'est pas branché).
  const mrrByMonth = Array.from({ length: 6 }, (_, index) => {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 1);
    const cutoff = Math.min(monthEnd.getTime(), now.getTime());
    return {
      label: MONTH_LABEL.format(new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)),
      mrr: customers
        .filter((profile) => createdAt(profile) <= cutoff)
        .reduce((sum, profile) => sum + monthlyRevenue(profile), 0),
    };
  });

  return {
    total: customers.length,
    newLast30: customers.filter((profile) => createdAt(profile) > since(30)).length,
    newPrev30: customers.filter(
      (profile) => createdAt(profile) <= since(30) && createdAt(profile) > since(60),
    ).length,
    online: customers.filter((profile) => isOnline(profile, now)).length,
    paying: paying.length,
    trialing: status("trialing"),
    pastDue: status("past_due"),
    canceled: status("canceled"),
    suspended: status("suspended"),
    mrr,
    arpa: paying.length ? Math.round(mrr / paying.length) : 0,
    trialConversion: endedTrials.length ? (converted / endedTrials.length) * 100 : 0,
    byChannel,
    byPlan: countBy(paying, (profile) => profile.plan),
    byPayment: countBy(paying, (profile) => profile.payment_method),
    byInterval: countBy(paying, (profile) => profile.billing_interval),
    signupsByWeek,
    mrrByMonth,
    trialsEndingSoon: customers
      .filter(
        (profile) =>
          profile.subscription_status === "trialing" &&
          Date.parse(profile.trial_ends_at) > now.getTime() &&
          Date.parse(profile.trial_ends_at) < now.getTime() + 3 * DAY_MS,
      )
      .sort((a, b) => Date.parse(a.trial_ends_at) - Date.parse(b.trial_ends_at)),
    latest: [...customers].sort((a, b) => createdAt(b) - createdAt(a)).slice(0, 6),
  };
}

export type AdminSummary = ReturnType<typeof summarize>;
