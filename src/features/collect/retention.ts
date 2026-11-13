import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Durée de conservation des visites (recommandation CNIL pour la mesure d'audience). */
export const EVENT_RETENTION_MONTHS = 25;

export function retentionCutoff(now: Date) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - EVENT_RETENTION_MONTHS);
  return cutoff;
}

/** Efface les visites plus anciennes que 25 mois (tâche horaire). Renvoie le nombre effacé. */
export async function purgeOldEvents(now = new Date()) {
  const service = createServiceClient();
  if (!service) return 0;
  const { count, error } = await service
    .from("events")
    .delete({ count: "exact" })
    .lt("occurred_at", retentionCutoff(now).toISOString());
  if (error) console.error("Effacement des anciennes visites :", error.message);
  return count ?? 0;
}
