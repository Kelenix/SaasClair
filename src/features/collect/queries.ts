import "server-only";
import type { Period } from "@/features/dashboard/period";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient, getUser } from "@/lib/supabase/server";
import { CHANNEL_LABELS, type Channel } from "@/features/attribution/attribution";
import { aggregateVisits, periodStart, type RealAcquisition } from "./aggregate";
import type { RealRevenue } from "@/features/stripe/metrics";
import { computeFunnel, type KeyPaths, type RealFunnel } from "./funnel";
import { linkCustomers, type CustomerLinks } from "./linking";

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

/**
 * Clients payants reliés à leur canal d'arrivée (empreinte de l'email identifiée par le script,
 * comparée à celle du client Stripe). Null tant que Stripe n'est pas connecté.
 */
export async function getCustomerLinks(revenue: RealRevenue | null): Promise<CustomerLinks | null> {
  if (!revenue) return null;
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return null;
  const [customers, { data: touches }] = await Promise.all([
    fetchAll(
      (from, to) =>
        supabase
          .from("stripe_customers")
          .select("id, email_hash")
          .eq("project_id", project.id)
          .not("email_hash", "is", null)
          .order("id")
          .range(from, to),
      MAX_ROWS,
    ),
    supabase.rpc("customer_first_touch", { p_project: project.id }),
  ]);
  return linkCustomers(
    revenue.customerMrr,
    customers,
    touches ?? [],
    (id) => CHANNEL_LABELS[id as Channel] ?? id,
  );
}

/**
 * Tunnel de la période : pages vues et identifications du compte connecté, ramenées aux pages
 * clés (tarifs, inscription). Null tant qu'aucune visite n'est arrivée.
 */
export async function getRealFunnel(
  period: Period,
  now: Date,
  paths: KeyPaths,
): Promise<RealFunnel | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return null;

  const since = periodStart(period, now).toISOString();
  const rows = await fetchAll(
    (from, to) =>
      supabase
        .from("events")
        .select("visitor_id, type, path, device, channel")
        .eq("project_id", project.id)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    MAX_ROWS,
  );
  if (!rows.length) return null;
  return computeFunnel(rows, paths, (id) => CHANNEL_LABELS[id as Channel] ?? id);
}
