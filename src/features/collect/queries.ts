import "server-only";
import type { Period } from "@/features/dashboard/period";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient, getUser } from "@/lib/supabase/server";
import { aggregateVisits, periodStart, type RealAcquisition } from "./aggregate";

/** Au-delà, l'agrégation passera en SQL (registre de la dette technique). */
const MAX_ROWS = 50_000;

/**
 * Vraies pages vues de la période, pour le compte connecté (la RLS ne laisse lire que les visites
 * de son propre site), agrégées pour l'écran Acquisition. Lecture par pages : le serveur coupe
 * chaque réponse à 1 000 lignes.
 */
export async function getRealAcquisition(period: Period, now: Date): Promise<RealAcquisition> {
  const user = await getUser();
  const supabase = await createClient();
  const { data: project } = user
    ? await supabase.from("projects").select("id").eq("owner_id", user.id).maybeSingle()
    : { data: null };
  if (!project) return aggregateVisits([], period, now);

  const since = periodStart(period, now).toISOString();
  const rows = await fetchAll(
    (from, to) =>
      supabase
        .from("events")
        .select("visitor_id, occurred_at, path, channel, utm_campaign, referrer_host, device")
        .eq("project_id", project.id)
        .eq("type", "pageview")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    MAX_ROWS,
  );
  return aggregateVisits(rows, period, now);
}
