// Âge de l'analyse du site (fonctions pures, testées) : quand la relancer, comment l'afficher.

/** Au-delà, l'analyse est relancée toute seule (ouverture du tableau de bord, tâche horaire). */
export const AUDIT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
/** Bouton « Analyser maintenant » : pas plus d'une analyse toutes les 30 secondes. */
export const AUDIT_MIN_INTERVAL_MS = 30 * 1000;

export const auditIsStale = (auditedAt: string | null, now: Date) =>
  !auditedAt || now.getTime() - Date.parse(auditedAt) > AUDIT_MAX_AGE_MS;

/** « à l'instant », « il y a 5 min », « il y a 3 h », « le 12 novembre ». */
export function auditAgeLabel(auditedAt: string | null, now: Date) {
  if (!auditedAt) return "date inconnue";
  const minutes = Math.floor((now.getTime() - Date.parse(auditedAt)) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `le ${new Date(auditedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}
