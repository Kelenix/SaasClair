import "server-only";
import { cache } from "react";
import type { Period } from "@/features/dashboard/period";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, getUser } from "@/lib/supabase/server";
import { computeRevenue, type RealRevenue } from "./metrics";

const MAX_SUBSCRIPTIONS = 20_000;
const MAX_INVOICES = 5_000;
/** Factures d'abonnement des 13 derniers mois (un client mensuel : 13 lignes). */
const MAX_RECURRING = 100_000;
const HISTORY_DAYS = 400;

type Client = SupabaseClient<Database>;

/**
 * Revenus et churn calculés sur les données Stripe importées du compte connecté (la RLS ne laisse
 * lire que les siennes). Null tant que Stripe n'est pas connecté (import terminé).
 */
export const getRealRevenue = cache(
  async (period: Period, now: Date): Promise<RealRevenue | null> => {
    const user = await getUser();
    if (!user) return null;
    const supabase = await createClient();
    // Filtre explicite : le super administrateur voit aussi les projets des autres (RLS).
    const { data: project } = await supabase
      .from("projects")
      .select("id, stripe_account_id, stripe_connected_at")
      .eq("owner_id", user.id)
      .maybeSingle();
    // Première importation réussie : ensuite, les resynchronisations n'effacent pas l'écran.
    if (!project?.stripe_account_id || !project.stripe_connected_at) return null;
    return loadRevenue(supabase, project.id, period, now);
  },
);

/**
 * Revenus d'un projet, avec le client donné : celui de la session (écrans, RLS), ou celui de la
 * clé de service (alertes envoyées par la tâche horaire, projet choisi par le serveur).
 */
export async function loadRevenue(
  supabase: Client,
  projectId: string,
  period: Period,
  now: Date,
): Promise<RealRevenue> {
  // Lecture par pages : le serveur coupe chaque réponse à 1 000 lignes (fetch-all.ts).
  const historySince = new Date(now.getTime() - HISTORY_DAYS * 86_400_000).toISOString();
  const [subscriptions, invoices, customers, recurring] = await Promise.all([
    fetchAll(
      (from, to) =>
        supabase
          .from("stripe_subscriptions")
          .select(
            "id, customer_id, status, mrr_cents, currency, price_unknown, plan_name, created_at, ended_at, cancel_at_period_end, current_period_end, trial_end, cancel_at, billing_interval, card_expires_at, cancel_reason, cancel_feedback",
          )
          .eq("project_id", projectId)
          .order("id")
          .range(from, to),
      MAX_SUBSCRIPTIONS,
    ),
    fetchAll(
      (from, to) =>
        supabase
          .from("stripe_invoices")
          .select(
            "id, customer_id, status, amount_due_cents, attempt_count, next_payment_attempt, currency, created_at",
          )
          .eq("project_id", projectId)
          .in("status", ["open", "uncollectible"])
          .order("id")
          .range(from, to),
      MAX_INVOICES,
    ),
    fetchAll(
      (from, to) =>
        supabase
          .from("stripe_customers")
          .select("id, name, email")
          .eq("project_id", projectId)
          .order("id")
          .range(from, to),
      MAX_SUBSCRIPTIONS,
    ),
    // Historique des montants facturés : expansion, contraction, revenu passé exact.
    fetchAll(
      (from, to) =>
        supabase
          .from("stripe_invoices")
          .select(
            "id, subscription_id, status, recurring_cents, period_start, period_end, amount_paid_cents",
          )
          .eq("project_id", projectId)
          .in("status", ["paid", "open"])
          .not("recurring_cents", "is", null)
          .gte("period_end", historySince)
          .order("id")
          .range(from, to),
      MAX_RECURRING,
    ),
  ]);
  return computeRevenue(subscriptions, invoices, customers, period, now, recurring);
}
