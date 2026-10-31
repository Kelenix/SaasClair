import type { Database } from "@/lib/supabase/database.types";
import type { SiteAudit } from "./site-analysis";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

/** Étape 0 (« Votre SaaS ») puis les 2 seules actions obligatoires, puis l'écran final. */
export type SetupStep = "site" | "script" | "stripe" | "done";

export const SETUP_STEPS: SetupStep[] = ["site", "script", "stripe", "done"];

export function stepOf(
  project: Pick<Project, "site_url" | "script_detected_at" | "stripe_connected_at"> | null,
): SetupStep {
  if (!project) return "site";
  if (!project.script_detected_at) return "script";
  if (!project.stripe_connected_at) return "stripe";
  return "done";
}

/** Données dont l'écran de configuration a besoin, sérialisables vers le client. */
export type SetupState = {
  firstName: string;
  siteUrl: string;
  audit: SiteAudit | null;
  siteKey: string | null;
  step: SetupStep;
};

/** Ligne de code à installer : la clé identifie le projet, jamais l'utilisateur. */
export const scriptSnippet = (siteKey: string) =>
  `<script async src="https://cdn.saasclair.fr/s.js" data-site="${siteKey}"></script>`;
