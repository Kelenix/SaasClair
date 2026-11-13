"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deauthorizeAccount, stripeConfig } from "@/features/stripe/client";
import { eraseAccount } from "@/features/account/erase";
import { displaySiteUrl } from "@/lib/site-url";
import { createClient, getUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const SAVE_ERROR = "Ce réglage n'a pas pu être enregistré. Réessayez dans un instant.";

/** Mot à saisir pour supprimer un projet qui n'a pas encore d'adresse de site. */
const DELETE_WORD = "supprimer";

/**
 * Supprime le projet et le suivi des insights, après saisie de l'adresse du site (ou du mot
 * « supprimer » sans adresse). L'accès à Stripe est d'abord coupé chez Stripe. Le compte reste
 * ouvert : l'utilisateur repart de la configuration.
 */
export async function deleteProject(confirmation: string): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("site_url, stripe_account_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return { ok: false, message: "Aucun projet à supprimer." };
  const expected = project.site_url ? displaySiteUrl(project.site_url) : DELETE_WORD;
  if (confirmation.trim().toLowerCase() !== expected.toLowerCase()) {
    return {
      ok: false,
      message: project.site_url
        ? "L'adresse saisie ne correspond pas à votre site."
        : `Écrivez « ${DELETE_WORD} » pour confirmer.`,
    };
  }

  // Accès Stripe coupé d'abord : sinon il resterait valable après la suppression.
  const config = stripeConfig();
  if (project.stripe_account_id && config) {
    const done = await deauthorizeAccount(config, project.stripe_account_id);
    if (!done) {
      return {
        ok: false,
        message: "Stripe n'a pas répondu : rien n'est supprimé. Réessayez dans un instant.",
      };
    }
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

/**
 * Supprime le compte de l'utilisateur connecté, après qu'il a retapé son email : projet,
 * données, réglages, abonnement SaasClair arrêté, accès Stripe coupé (account/erase.ts). Le
 * super administrateur ne peut pas se supprimer ici : il resterait sans administration.
 */
export async function deleteMyAccount(emailConfirmation: string): Promise<Result> {
  const user = await getUser();
  if (!user?.email) return { ok: false, message: SAVE_ERROR };
  if (user.email.toLowerCase() !== emailConfirmation.trim().toLowerCase()) {
    return { ok: false, message: "L'email saisi ne correspond pas à votre compte." };
  }
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "super_admin") {
    return {
      ok: false,
      message:
        "Un super administrateur ne peut pas supprimer son propre compte : retirez d'abord ce rôle.",
    };
  }

  const erased = await eraseAccount(user.id);
  if (!erased.ok) return erased;
  // Session effacée de ce navigateur (le compte n'existe plus côté serveur).
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect("/connexion?compte=supprime");
}
