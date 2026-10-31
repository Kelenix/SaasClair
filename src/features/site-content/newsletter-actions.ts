"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NewsletterState = { status?: "success" | "error"; message?: string };

const emailSchema = z
  .email("Vérifiez l'adresse : par exemple prenom@entreprise.fr")
  .max(254)
  .transform((value) => value.toLowerCase());

/** Inscription à la newsletter depuis le site (piège à robots : le champ « site » doit rester vide). */
export async function subscribeToNewsletter(
  _: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  if (String(formData.get("site") ?? "")) return { status: "success", message: "Merci !" };
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }
  const source = String(formData.get("source") ?? "pied-de-page").slice(0, 40);
  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email: parsed.data, source });
  if (error && error.code !== "23505") {
    return { status: "error", message: "L'inscription n'a pas abouti. Réessayez dans un instant." };
  }
  return {
    status: "success",
    message:
      error?.code === "23505"
        ? "Vous êtes déjà inscrit. Merci de votre fidélité !"
        : "C'est noté. Vous recevrez nos prochains conseils.",
  };
}
