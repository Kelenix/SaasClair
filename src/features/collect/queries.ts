import "server-only";
import type { Period } from "@/features/dashboard/period";
import { createClient } from "@/lib/supabase/server";
import { aggregateVisits, periodStart, type RealAcquisition } from "./aggregate";

/** Au-delà, l'agrégation passera en SQL (registre de la dette technique). */
const MAX_ROWS = 50_000;

/**
 * Vraies pages vues de la période, pour le compte connecté (la RLS ne laisse lire que les visites
 * de son propre site), agrégées pour l'écran Acquisition.
 */
export async function getRealAcquisition(period: Period, now: Date): Promise<RealAcquisition> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("visitor_id, occurred_at, path, channel, utm_campaign, referrer_host, device")
    .eq("type", "pageview")
    .gte("occurred_at", periodStart(period, now).toISOString())
    .order("occurred_at", { ascending: true })
    .limit(MAX_ROWS);
  return aggregateVisits(data ?? [], period, now);
}
