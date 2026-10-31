import "server-only";
import { cache } from "react";
import type { Period } from "@/features/dashboard/period";
import { createClient, getUser } from "@/lib/supabase/server";
import { computeRevenue, type RealRevenue } from "./metrics";

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
      .select("stripe_account_id, stripe_sync_status")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!project?.stripe_account_id || project.stripe_sync_status !== "done") return null;

    const [subscriptions, invoices, customers] = await Promise.all([
      supabase
        .from("stripe_subscriptions")
        .select(
          "id, customer_id, status, mrr_cents, plan_name, created_at, ended_at, cancel_at_period_end, current_period_end",
        )
        .limit(20_000),
      supabase
        .from("stripe_invoices")
        .select("id, customer_id, status, amount_due_cents, attempt_count, next_payment_attempt")
        .in("status", ["open", "uncollectible"])
        .limit(5_000),
      supabase.from("stripe_customers").select("id, name, email").limit(20_000),
    ]);
    return computeRevenue(
      subscriptions.data ?? [],
      invoices.data ?? [],
      customers.data ?? [],
      period,
      now,
    );
  },
);
