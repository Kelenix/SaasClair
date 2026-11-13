import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { auditSite } from "./fetch-site";
import { auditIsStale, AUDIT_MAX_AGE_MS } from "./audit-age";

/**
 * Relance l'analyse d'un site si elle est trop ancienne (plus de 6 heures). Une seule analyse à
 * la fois par projet : la date est « réservée » d'abord, de façon atomique, puis l'analyse
 * s'écrit. Renvoie true si une analyse a été faite.
 */
export async function refreshAuditIfStale(projectId: string, siteUrl: string, now = new Date()) {
  const service = createServiceClient();
  if (!service) return false;
  const threshold = new Date(now.getTime() - AUDIT_MAX_AGE_MS).toISOString();
  const { data: claimed } = await service
    .from("projects")
    .update({ audited_at: now.toISOString() })
    .eq("id", projectId)
    .or(`audited_at.is.null,audited_at.lt.${threshold}`)
    .select("id");
  if (!claimed?.length) return false;
  const audit = await auditSite(siteUrl);
  await service
    .from("projects")
    .update({ audit, audited_at: new Date().toISOString() })
    .eq("id", projectId);
  return true;
}

/** Tâche horaire : réanalyse les sites dont l'analyse a plus de 6 heures, l'un après l'autre. */
export async function refreshStaleAudits(limit = 100) {
  const service = createServiceClient();
  if (!service) return 0;
  const now = new Date();
  const { data: projects } = await service
    .from("projects")
    .select("id, site_url, audited_at")
    .not("site_url", "is", null)
    .order("audited_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  let refreshed = 0;
  for (const project of projects ?? []) {
    if (!auditIsStale(project.audited_at, now)) break;
    if (await refreshAuditIfStale(project.id, project.site_url!, now)) refreshed += 1;
  }
  return refreshed;
}
