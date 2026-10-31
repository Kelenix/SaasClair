import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { SiteAudit } from "@/features/setup/site-analysis";
import { remainingSteps, type ActionStep } from "@/features/setup/steps";
import { accessOf, type Access } from "@/features/billing/plans";
import { isDemoMode } from "@/lib/demo-mode";
import { createClient, getUser } from "@/lib/supabase/server";

export type InsightStatus = "done" | "ignored";

export type DashboardContext = {
  /** Données d'exemple affichées (poste de développement et tests uniquement). */
  demo: boolean;
  firstName: string;
  email: string;
  siteUrl: string | null;
  /** Analyse du site faite à l'étape 0 (pages clés, vitesse, référencement, technologies). */
  audit: SiteAudit | null;
  isSetupComplete: boolean;
  /** Étapes de la configuration passées ou pas encore faites, rappelées par le bandeau. */
  setupRemaining: ActionStep[];
  /** Page de paiement : détectée par l'analyse ou confirmée en un clic. Null = à confirmer. */
  checkoutUrl: string | null;
  /** Identifiant du site dans la ligne de script. */
  siteKey: string | null;
  scriptDetected: boolean;
  stripeConnected: boolean;
  anonymizeVisitors: boolean;
  /** Début de l'essai gratuit (7 jours, TRIAL_DAYS). */
  accountCreatedAt: string;
  feedback: Record<string, InsightStatus>;
  isSuperAdmin: boolean;
  /** Compte suspendu par le super administrateur : accès au tableau de bord fermé. */
  isSuspended: boolean;
  /** Droit d'accès : essai, abonné, paiement en échec, essai terminé (choix d'offre), suspendu. */
  access: Access;
  billing: {
    plan: string;
    interval: string | null;
    paymentMethod: string | null;
    status: string;
    trialEndsAt: string;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasStripeCustomer: boolean;
  };
};

/** Utilisateur, projet et retours sur les insights — lus une seule fois par requête. */
export const getDashboardContext = cache(async (): Promise<DashboardContext> => {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/app");

  const supabase = await createClient();
  const [{ data: project }, { data: feedback }, { data: profile }] = await Promise.all([
    supabase.from("projects").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("insight_feedback").select("insight_id, status").eq("owner_id", user.id),
    supabase
      .from("profiles")
      .select(
        "role, subscription_status, plan, billing_interval, payment_method, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id",
      )
      .eq("id", user.id)
      .maybeSingle(),
    // « Vu à l'instant » pour l'espace administrateur (au plus une écriture par minute).
    supabase.rpc("touch_last_seen"),
  ]);
  const audit = project?.audit as SiteAudit | null | undefined;
  const setupRemaining = remainingSteps(project);

  return {
    demo: isDemoMode(),
    firstName: (user.user_metadata.first_name as string | undefined) ?? "",
    email: user.email ?? "",
    siteUrl: project?.site_url ?? null,
    audit: audit ?? null,
    isSetupComplete: setupRemaining.length === 0,
    setupRemaining,
    checkoutUrl: project?.checkout_url ?? audit?.pages.checkout ?? null,
    siteKey: project?.id.slice(0, 8) ?? null,
    scriptDetected: Boolean(project?.script_detected_at),
    stripeConnected: Boolean(project?.stripe_connected_at),
    anonymizeVisitors: project?.anonymize_visitors ?? true,
    accountCreatedAt: user.created_at,
    isSuperAdmin: profile?.role === "super_admin",
    isSuspended: profile?.subscription_status === "suspended",
    access: accessOf(profile, new Date()),
    billing: {
      plan: profile?.plan ?? "trial",
      interval: profile?.billing_interval ?? null,
      paymentMethod: profile?.payment_method ?? null,
      status: profile?.subscription_status ?? "trialing",
      trialEndsAt: profile?.trial_ends_at ?? new Date().toISOString(),
      periodEnd: profile?.current_period_end ?? null,
      cancelAtPeriodEnd: profile?.cancel_at_period_end ?? false,
      hasStripeCustomer: Boolean(profile?.stripe_customer_id),
    },
    feedback: Object.fromEntries((feedback ?? []).map((row) => [row.insight_id, row.status])),
  };
});
