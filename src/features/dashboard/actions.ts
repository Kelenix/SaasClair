"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { INSIGHTS } from "./demo-data";

type Result = { ok: true } | { ok: false; message: string };

const SAVE_ERROR = "Ce choix n'a pas pu être enregistré. Réessayez dans un instant.";
const INSIGHT_IDS = new Set(INSIGHTS.map((insight) => insight.id));

/** « Fait », « Ignorer », ou annulation (status null) d'une recommandation. */
export async function setInsightStatus(
  insightId: string,
  status: "done" | "ignored" | null,
): Promise<Result> {
  const user = await getUser();
  if (!user || !INSIGHT_IDS.has(insightId)) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { error } = status
    ? await supabase
        .from("insight_feedback")
        .upsert({ owner_id: user.id, insight_id: insightId, status })
    : await supabase.from("insight_feedback").delete().eq("insight_id", insightId);
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Mode secours : l'utilisateur confirme sa page de paiement en un clic (même site uniquement). */
export async function confirmCheckoutPage(input: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("site_url")
    .eq("owner_id", user.id)
    .maybeSingle();
  let url: URL;
  try {
    url = new URL(input, project?.site_url ?? undefined);
  } catch {
    return { ok: false, message: "Cette adresse ne semble pas valide. Exemple : /paiement" };
  }
  if (!project?.site_url || url.origin !== new URL(project.site_url).origin) {
    return { ok: false, message: "Indiquez une page de votre site, par exemple /paiement." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ checkout_url: url.toString() })
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app", "layout");
  return { ok: true };
}
