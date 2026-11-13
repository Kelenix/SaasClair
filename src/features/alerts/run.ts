import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { acquisitionFromSummary, type AcquisitionSummary } from "@/features/collect/aggregate";
import { funnelFromSummary, pathOf, type FunnelSummary } from "@/features/collect/funnel";
import { ALERT_IDS, type AlertId } from "@/features/dashboard/alerts/catalog";
import { buildInsights } from "@/features/insights/engine";
import type { SiteAudit } from "@/features/setup/site-analysis";
import { loadRevenue } from "@/features/stripe/queries";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { composeAlert, detectAlerts, isDigestTime, type AlertEvent } from "./detect";
import { sendAlertEmail, sendAlertSlack } from "./send";

// Tâche horaire (route /api/stripe/sync) : pour chaque compte, les alertes nouvelles depuis le
// dernier passage, envoyées par email et Slack selon ses réglages. Chaque fait n'est envoyé
// qu'une fois (alert_deliveries) ; un envoi raté est retenté au passage suivant.

type Service = SupabaseClient<Database>;
type Project = {
  id: string;
  owner_id: string;
  site_url: string | null;
  audit: unknown;
  pricing_url: string | null;
  signup_url: string | null;
  script_detected_at: string | null;
  stripe_connected_at: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (t: number) => new Date(t).toISOString();

async function visitors(service: Service, projectId: string, since: number, until: number) {
  const { data } = await service.rpc("acquisition_summary", {
    p_project: projectId,
    p_since: iso(since),
    p_until: iso(until),
    p_buckets: 1,
  });
  return (data as AcquisitionSummary | null)?.visitors ?? 0;
}

/** Part des visiteurs qui atteignent la dernière étape du tunnel, sur [since, until[. */
async function funnelReach(service: Service, project: Project, since: number, until: number) {
  const paths = {
    pricing: pathOf(project.pricing_url, project.site_url),
    signup: pathOf(project.signup_url, project.site_url),
  };
  const { data } = await service.rpc("funnel_summary", {
    p_project: project.id,
    p_since: iso(since),
    p_until: iso(until),
    p_pricing: paths.pricing ?? "",
    p_signup: paths.signup ?? "",
  });
  const summary = data as FunnelSummary | null;
  if (!summary?.groups.length) return null;
  const funnel = funnelFromSummary(summary, paths, (id) => id, {
    stripe: Boolean(project.stripe_connected_at),
  });
  const last = funnel.steps.at(-1)!;
  return funnel.steps.length > 1
    ? { step: last.label, visitors: funnel.visitors, reached: last.count }
    : null;
}

async function alertsFor(service: Service, project: Project, now: Date) {
  const [{ data: settings }, { data: profile }] = await Promise.all([
    service
      .from("alert_settings")
      .select("disabled_alerts, email_enabled, slack_webhook_url")
      .eq("owner_id", project.owner_id)
      .maybeSingle(),
    service
      .from("profiles")
      .select("email, first_name, subscription_status")
      .eq("id", project.owner_id)
      .maybeSingle(),
  ]);
  if (!profile || profile.subscription_status === "suspended") return;
  const emailEnabled = settings?.email_enabled ?? true;
  const slack = settings?.slack_webhook_url ?? null;
  if (!emailEnabled && !slack) return;
  const disabled = new Set(settings?.disabled_alerts ?? []);

  const t = now.getTime();
  const [revenue, lastVisit, visitors7d, last24, previous24, current, previous, monthly] =
    await Promise.all([
      project.stripe_connected_at ? loadRevenue(service, project.id, "30j", now) : null,
      service
        .from("events")
        .select("occurred_at")
        .eq("project_id", project.id)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      visitors(service, project.id, t - 7 * DAY_MS, t),
      visitors(service, project.id, t - DAY_MS, t),
      visitors(service, project.id, t - 2 * DAY_MS, t - DAY_MS),
      funnelReach(service, project, t - 7 * DAY_MS, t),
      funnelReach(service, project, t - 14 * DAY_MS, t - 7 * DAY_MS),
      // Insights : seulement pour le résumé du lundi (visites sur 30 jours).
      isDigestTime(now)
        ? service.rpc("acquisition_summary", {
            p_project: project.id,
            p_since: iso(t - 30 * DAY_MS),
            p_until: iso(t),
            p_buckets: 30,
          })
        : null,
    ]);

  const insights = monthly
    ? buildInsights({
        now,
        siteUrl: project.site_url,
        audit: (project.audit as SiteAudit | null) ?? null,
        revenue,
        visits: acquisitionFromSummary(monthly.data as AcquisitionSummary | null, "30j"),
      })
    : [];
  const events = detectAlerts({
    now,
    revenue,
    lastVisitAt: project.script_detected_at ? (lastVisit.data?.occurred_at ?? null) : null,
    visitors7d,
    traffic: { last: last24, previous: previous24 },
    conversion:
      current && previous && current.step === previous.step
        ? { step: current.step, current, previous }
        : null,
    insights,
  }).filter((event) => !disabled.has(event.alertId));

  const byAlert = new Map<AlertId, AlertEvent[]>();
  for (const event of events)
    byAlert.set(event.alertId, [...(byAlert.get(event.alertId) ?? []), event]);

  for (const alertId of ALERT_IDS) {
    const candidates = byAlert.get(alertId);
    if (!candidates?.length) continue;
    // Réservation : seuls les faits jamais envoyés reviennent (doublon ignoré par la base).
    const { data: reserved, error } = await service
      .from("alert_deliveries")
      .upsert(
        candidates.map((event) => ({
          owner_id: project.owner_id,
          alert_id: alertId,
          key: event.key,
        })),
        { onConflict: "owner_id,alert_id,key", ignoreDuplicates: true },
      )
      .select("key");
    if (error || !reserved?.length) continue;
    const keys = new Set(reserved.map((row) => row.key));
    const fresh = candidates.filter((event) => keys.has(event.key));
    const message = composeAlert(alertId, fresh);

    const sent = await Promise.all([
      emailEnabled
        ? sendAlertEmail(profile.email, message, profile.first_name).catch((err: unknown) => {
            console.error("Alerte (email) :", err instanceof Error ? err.message : err);
            return false;
          })
        : false,
      slack ? sendAlertSlack(slack, message) : false,
    ]);
    // Rien n'est parti (SMTP absent, Slack injoignable) : retenté au prochain passage.
    if (!sent.some(Boolean)) {
      await service
        .from("alert_deliveries")
        .delete()
        .eq("owner_id", project.owner_id)
        .eq("alert_id", alertId)
        .in("key", [...keys]);
    }
  }
}

/** Alertes de tous les comptes, l'un après l'autre (une erreur n'arrête pas les suivants). */
export async function sendDueAlerts(now = new Date()) {
  const service = createServiceClient();
  if (!service) return;
  const { data: projects } = await service
    .from("projects")
    .select(
      "id, owner_id, site_url, audit, pricing_url, signup_url, script_detected_at, stripe_connected_at",
    );
  for (const project of projects ?? []) {
    try {
      await alertsFor(service, project, now);
    } catch (error) {
      console.error("Alertes :", error instanceof Error ? error.message : error);
    }
  }
}
