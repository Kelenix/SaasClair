"use server";

import { revalidatePath } from "next/cache";
import { isSameSite } from "@/features/collect/payload";
import { createClient, getUser } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const SAVE_ERROR = "Ce choix n'a pas pu être enregistré. Réessayez dans un instant.";
/** Identifiants des insights : démonstration (« 2026-44-… ») et moteur réel (« paiements-2026-46 »). */
const INSIGHT_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** « Fait », « Ignorer », ou annulation (status null) d'une recommandation. */
export async function setInsightStatus(
  insightId: string,
  status: "done" | "ignored" | null,
): Promise<Result> {
  const user = await getUser();
  if (!user || typeof insightId !== "string" || !INSIGHT_ID.test(insightId)) {
    return { ok: false, message: SAVE_ERROR };
  }
  if (status !== null && status !== "done" && status !== "ignored") {
    return { ok: false, message: SAVE_ERROR };
  }

  const supabase = await createClient();
  const { error } = status
    ? await supabase
        .from("insight_feedback")
        .upsert({ owner_id: user.id, insight_id: insightId, status })
    : await supabase
        .from("insight_feedback")
        .delete()
        .eq("owner_id", user.id)
        .eq("insight_id", insightId);
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export type KeyPageKind = "checkout" | "signup" | "pricing";
const KEY_PAGE_COLUMNS = {
  checkout: "checkout_url",
  signup: "signup_url",
  pricing: "pricing_url",
} as const;

/**
 * Mode secours : l'utilisateur confirme une page clé en un clic (même site uniquement) : paiement,
 * inscription ou tarifs. Elle sert au tunnel de conversion.
 */
export async function confirmKeyPage(kind: KeyPageKind, input: string): Promise<Result> {
  const user = await getUser();
  if (
    !user ||
    !Object.hasOwn(KEY_PAGE_COLUMNS, kind) ||
    typeof input !== "string" ||
    input.length > 2048
  ) {
    return { ok: false, message: SAVE_ERROR };
  }

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
    return { ok: false, message: "Cette adresse ne semble pas valide. Exemple : /inscription" };
  }
  // Même site, sous-domaines compris (l'inscription est souvent sur app.monsaas.fr).
  if (
    !project?.site_url ||
    !/^https?:$/.test(url.protocol) ||
    !isSameSite(url.hostname, new URL(project.site_url).hostname)
  ) {
    return { ok: false, message: "Indiquez une page de votre site, par exemple /inscription." };
  }

  const { error } = await supabase
    .from("projects")
    .update(
      kind === "checkout"
        ? { checkout_url: url.toString() }
        : kind === "signup"
          ? { signup_url: url.toString() }
          : { pricing_url: url.toString() },
    )
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app", "layout");
  return { ok: true };
}
