import "server-only";
import type { Period } from "@/features/dashboard/period";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient, getUser } from "@/lib/supabase/server";
import { CHANNEL_LABELS, type Channel } from "@/features/attribution/attribution";
import {
  acquisitionFromSummary,
  BUCKETS,
  periodStart,
  type AcquisitionSummary,
  type RealAcquisition,
} from "./aggregate";
import type { RealRevenue } from "@/features/stripe/metrics";
import { funnelFromSummary, type FunnelSummary, type KeyPaths, type RealFunnel } from "./funnel";
import { linkCustomers, type CustomerLinks } from "./linking";

/** Clients Stripe lus pour les relier à leur canal. */
const MAX_CUSTOMERS = 50_000;

/**
 * Pages vues de la période, pour le compte connecté (la RLS ne laisse lire que les visites de son
 * propre site), regroupées par la base pour l'écran Acquisition : quelques totaux, quel que soit
 * le nombre de visites.
 */
export async function getRealAcquisition(period: Period, now: Date): Promise<RealAcquisition> {
  const user = await getUser();
  const supabase = await createClient();
  const { data: project } = user
    ? await supabase.from("projects").select("id").eq("owner_id", user.id).maybeSingle()
    : { data: null };
  if (!project) return acquisitionFromSummary(null, period);

  const { data, error } = await supabase.rpc("acquisition_summary", {
    p_project: project.id,
    p_since: periodStart(period, now).toISOString(),
    p_until: now.toISOString(),
    p_buckets: BUCKETS[period],
  });
  if (error) console.error("Acquisition :", error.message);
  return acquisitionFromSummary((data as AcquisitionSummary | null) ?? null, period);
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
      MAX_CUSTOMERS,
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

  const { data, error } = await supabase.rpc("funnel_summary", {
    p_project: project.id,
    p_since: periodStart(period, now).toISOString(),
    // Page clé inconnue : chaîne vide (aucune étape mesurée pour elle).
    p_pricing: paths.pricing ?? "",
    p_signup: paths.signup ?? "",
  });
  if (error) console.error("Tunnel :", error.message);
  const summary = data as FunnelSummary | null;
  if (!summary?.groups.length) return null;
  return funnelFromSummary(summary, paths, (id) => CHANNEL_LABELS[id as Channel] ?? id);
}
