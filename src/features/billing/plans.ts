// Offres payantes de SaasClair (prix hors taxes : la TVA est calculée par Stripe Tax selon le
// pays du client, ADR-027) et droits d'accès qui en découlent. Fonctions pures, testées.

export const PAID_PLANS = ["starter", "growth"] as const;
export type PaidPlan = (typeof PAID_PLANS)[number];
export type Interval = "monthly" | "annual";

/** Prix mensuels HT, en euros (annuel : −20 %, payé en une fois). */
export const MONTHLY_PRICE: Record<PaidPlan, number> = { starter: 29, growth: 79 };
export const ANNUAL_DISCOUNT = 0.2;
export const annualTotal = (plan: PaidPlan) =>
  Math.round(MONTHLY_PRICE[plan] * 12 * (1 - ANNUAL_DISCOUNT) * 100) / 100;

/** Visites suivies par mois, selon l'offre (l'essai donne l'offre Growth). */
export const VISIT_LIMIT: Record<"trial" | PaidPlan | "pro", number | null> = {
  trial: 200_000,
  starter: 50_000,
  growth: 200_000,
  pro: null,
};

export const PLAN_LABEL: Record<"trial" | PaidPlan | "pro", string> = {
  trial: "Essai gratuit",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

/** Identifiant stable des prix dans Stripe (lookup_key), créés par scripts/billing-setup.mjs. */
export const lookupKey = (plan: PaidPlan, interval: Interval) => `saasclair_${plan}_${interval}`;

export function parseLookupKey(key: string | null | undefined) {
  const match = key?.match(/^saasclair_(starter|growth)_(monthly|annual)$/);
  return match ? { plan: match[1] as PaidPlan, interval: match[2] as Interval } : null;
}

export const isPaidPlan = (value: unknown): value is PaidPlan =>
  PAID_PLANS.includes(value as PaidPlan);

export type AccessProfile = {
  role: string;
  subscription_status: string;
  trial_ends_at: string;
};

/**
 * Accès au tableau de bord :
 * - « paid » : abonnement actif ;
 * - « past_due » : paiement en échec, Stripe retente, accès gardé avec un bandeau ;
 * - « trial » : essai en cours ;
 * - « expired » : essai terminé sans abonnement, ou abonnement arrêté (écran de choix d'offre) ;
 * - « suspended » : suspendu par le super administrateur.
 * Le super administrateur n'est jamais bloqué.
 */
export type Access = "paid" | "past_due" | "trial" | "expired" | "suspended";

export function accessOf(profile: AccessProfile | null, now: Date): Access {
  if (!profile || profile.role === "super_admin") return "paid";
  switch (profile.subscription_status) {
    case "suspended":
      return "suspended";
    case "active":
      return "paid";
    case "past_due":
      return "past_due";
    case "trialing":
      return Date.parse(profile.trial_ends_at) > now.getTime() ? "trial" : "expired";
    default:
      return "expired";
  }
}

export const trialDaysLeft = (trialEndsAt: string, now: Date) =>
  Math.max(0, Math.ceil((Date.parse(trialEndsAt) - now.getTime()) / 86_400_000));
