"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { displaySiteUrl } from "@/lib/site-url";
import { createClient, getUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const SAVE_ERROR = "Ce réglage n'a pas pu être enregistré. Réessayez dans un instant.";

/** Anonymisation des visiteurs (active par défaut). */
export async function setAnonymizeVisitors(input: unknown): Promise<Result> {
  const user = await getUser();
  const parsed = z.boolean().safeParse(input);
  if (!user || !parsed.success) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ anonymize_visitors: parsed.data })
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app/parametres");
  return { ok: true };
}

/**
 * Supprime le projet et le suivi des insights, après saisie de l'adresse du site.
 * Le compte reste ouvert : l'utilisateur repart de la configuration.
 */
export async function deleteProject(confirmation: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("site_url")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { ok: false, message: "Aucun projet à supprimer." };
  if (confirmation.trim().toLowerCase() !== displaySiteUrl(project.site_url).toLowerCase()) {
    return { ok: false, message: "L'adresse saisie ne correspond pas à votre site." };
  }

  const [projectDeletion, feedbackDeletion] = await Promise.all([
    supabase.from("projects").delete().eq("owner_id", user.id),
    supabase.from("insight_feedback").delete().eq("owner_id", user.id),
  ]);
  if (projectDeletion.error || feedbackDeletion.error) {
    return { ok: false, message: "La suppression n'a pas abouti. Vos données sont intactes." };
  }
  revalidatePath("/", "layout");
  redirect("/configuration");
}
