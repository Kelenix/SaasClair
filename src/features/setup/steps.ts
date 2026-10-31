import type { Database } from "@/lib/supabase/database.types";
import type { SiteAudit } from "./site-analysis";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

/** Étape 0 (« Votre SaaS ») puis les 2 seules actions obligatoires, puis l'écran final. */
export type SetupStep = "site" | "script" | "stripe" | "done";

/** Les étapes à faire (chacune peut être passée, puis reprise depuis le tableau de bord). */
export type ActionStep = Exclude<SetupStep, "done">;

export const SETUP_STEPS: SetupStep[] = ["site", "script", "stripe", "done"];
export const ACTION_STEPS: ActionStep[] = ["site", "script", "stripe"];

type ProjectProgress = Pick<Project, "site_url" | "script_detected_at" | "stripe_connected_at">;

/** Étapes déjà faites. */
export function completedSteps(project: ProjectProgress | null): Record<ActionStep, boolean> {
  return {
    site: Boolean(project?.site_url),
    script: Boolean(project?.script_detected_at),
    stripe: Boolean(project?.stripe_connected_at),
  };
}

/** Étapes encore à faire, dans l'ordre du parcours. */
export const remainingSteps = (project: ProjectProgress | null) => {
  const completed = completedSteps(project);
  return ACTION_STEPS.filter((step) => !completed[step]);
};

/** Première étape à faire, ou « done » quand tout est fait. */
export const stepOf = (project: ProjectProgress | null): SetupStep =>
  remainingSteps(project)[0] ?? "done";

/**
 * Où aller après l'étape `from` (faite ou passée) : l'étape suivante encore à faire, l'écran final
 * si tout est fait, sinon le tableau de bord (« later »), qui rappelle ce qui reste.
 */
export function nextStep(
  from: ActionStep,
  completed: Record<ActionStep, boolean>,
): SetupStep | "later" {
  const after = ACTION_STEPS.slice(ACTION_STEPS.indexOf(from) + 1).find((step) => !completed[step]);
  if (after) return after;
  return ACTION_STEPS.every((step) => completed[step]) ? "done" : "later";
}

export const isActionStep = (value: unknown): value is ActionStep =>
  ACTION_STEPS.includes(value as ActionStep);

/** Données dont l'écran de configuration a besoin, sérialisables vers le client. */
export type SetupState = {
  firstName: string;
  siteUrl: string;
  audit: SiteAudit | null;
  siteKey: string | null;
  step: SetupStep;
  completed: Record<ActionStep, boolean>;
  /** Détection du script et import Stripe simulés (poste de développement et tests uniquement). */
  demo: boolean;
};

/** Ligne de code à installer : la clé identifie le projet, jamais l'utilisateur. */
export const scriptSnippet = (siteKey: string) =>
  `<script async src="https://cdn.saasclair.fr/s.js" data-site="${siteKey}"></script>`;
