"use server";

import { normalizeSiteUrl } from "@/lib/site-url";
import { createClient, getUser } from "@/lib/supabase/server";
import { auditSite } from "./fetch-site";
import type { SiteAudit } from "./site-analysis";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const SAVE_ERROR = "Nous n'avons pas pu enregistrer cette étape. Réessayez dans un instant.";

async function authenticatedClient() {
  const user = await getUser();
  if (!user) throw new Error("Session expirée");
  return { supabase: await createClient(), user };
}

/** Étape 0 : analyse réelle de la page d'accueil, puis création (ou mise à jour) du projet. */
export async function analyzeSite(
  input: string,
): Promise<Result<{ siteUrl: string; siteKey: string; audit: SiteAudit }>> {
  const siteUrl = normalizeSiteUrl(input);
  if (!siteUrl)
    return { ok: false, message: "Entrez l'adresse de votre site, par exemple monsaas.fr." };

  const { supabase, user } = await authenticatedClient();
  const audit = await auditSite(siteUrl);
  const { data, error } = await supabase
    .from("projects")
    .upsert({ owner_id: user.id, site_url: siteUrl, audit }, { onConflict: "owner_id" })
    .select("id")
    .single();
  if (error) return { ok: false, message: SAVE_ERROR };
  return { ok: true, data: { siteUrl, siteKey: data.id.slice(0, 8), audit } };
}

/**
 * Étape 1 : script détecté. En démonstration la détection est simulée côté interface ;
 * avec la collecte réelle, c'est la première visite reçue qui appellera cette mise à jour.
 */
export async function markScriptDetected(): Promise<Result<null>> {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase
    .from("projects")
    .update({ script_detected_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .is("script_detected_at", null);
  return error ? { ok: false, message: SAVE_ERROR } : { ok: true, data: null };
}

/** Étape 2 : Stripe connecté (lecture seule). Simulé tant que Stripe Connect n'est pas branché. */
export async function connectStripe(): Promise<Result<null>> {
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase
    .from("projects")
    .update({ stripe_connected_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .is("stripe_connected_at", null);
  return error ? { ok: false, message: SAVE_ERROR } : { ok: true, data: null };
}
