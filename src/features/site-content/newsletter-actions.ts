"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

export type NewsletterState = { status?: "success" | "error"; message?: string };

const emailSchema = z
  .email("Vérifiez l'adresse : par exemple prenom@entreprise.fr")
  .max(254)
  .transform((value) => value.toLowerCase());

// Au plus 5 inscriptions par adresse IP et par quart d'heure (adresse posée par Nginx).
const perIp = createRateLimiter({ limit: 5, windowMs: 15 * 60 * 1000 });
const DONE = "C'est noté. Vous recevrez nos prochains conseils.";

/**
 * Inscription à la newsletter depuis le site (piège à robots : le champ « site » doit rester
 * vide). Écrite par le serveur seulement ; même réponse que l'adresse soit déjà inscrite ou non
 * (on ne révèle pas qui est abonné).
 */
export async function subscribeToNewsletter(
  _: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  if (String(formData.get("site") ?? "")) return { status: "success", message: "Merci !" };
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }
  const ip = (await headers()).get("x-real-ip") ?? "";
  if (ip && !perIp.take(ip)) {
    return {
      status: "error",
      message: "Trop d'inscriptions en peu de temps. Réessayez plus tard.",
    };
  }
  const source = String(formData.get("source") ?? "pied-de-page").slice(0, 40);
  const service = createServiceClient();
  const error = service
    ? (await service.from("newsletter_subscribers").insert({ email: parsed.data, source })).error
    : { code: "unavailable" };
  // 23505 : déjà inscrit. Même réponse qu'une nouvelle inscription.
  if (error && error.code !== "23505") {
    return { status: "error", message: "L'inscription n'a pas abouti. Réessayez dans un instant." };
  }
  return { status: "success", message: DONE };
}
