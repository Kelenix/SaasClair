"use server";

import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/demo-mode";
import { AUDIT_MIN_INTERVAL_MS } from "./audit-age";
import { normalizeSiteUrl } from "@/lib/site-url";
import { createClient, getUser } from "@/lib/supabase/server";
import { auditSite, fetchHomepage } from "./fetch-site";
import { checkInstall, INSTALL_MESSAGES, type InstallStatus } from "./install-check";
import type { SiteAudit } from "./site-analysis";

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const SAVE_ERROR = "Nous n'avons pas pu enregistrer cette étape. Réessayez dans un instant.";
const SIMULATION_OFF = "Cette étape se valide automatiquement dès que la connexion est réelle.";

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
    .upsert(
      { owner_id: user.id, site_url: siteUrl, audit, audited_at: new Date().toISOString() },
      { onConflict: "owner_id" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, message: SAVE_ERROR };
  return { ok: true, data: { siteUrl, siteKey: data.id.slice(0, 8), audit } };
}

/**
 * Tableau de bord, « Analyser maintenant » : relance l'analyse de la page d'accueil pour voir
 * tout de suite l'effet d'une correction. Au plus une analyse toutes les 30 secondes.
 */
export async function refreshSiteAudit(): Promise<Result<{ score: number; tooSoon: boolean }>> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("site_url, audit, audited_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project?.site_url) {
    return { ok: false, message: "Ajoutez d'abord l'adresse de votre site." };
  }
  const last = project.audited_at ? Date.parse(project.audited_at) : 0;
  if (Date.now() - last < AUDIT_MIN_INTERVAL_MS) {
    const score = (project.audit as SiteAudit | null)?.seo.score ?? 0;
    return { ok: true, data: { score, tooSoon: true } };
  }

  const audit = await auditSite(project.site_url);
  const { error } = await supabase
    .from("projects")
    .update({ audit, audited_at: new Date().toISOString() })
    .eq("owner_id", user.id);
  if (error) return { ok: false, message: "L'analyse n'a pas pu être enregistrée. Réessayez." };
  revalidatePath("/app", "layout");
  if (!audit.reachable) {
    return { ok: false, message: "Votre site n'a pas répondu. Vérifiez qu'il est en ligne." };
  }
  return { ok: true, data: { score: audit.seo.score, tooSoon: false } };
}

/**
 * « Passer cette étape » ou « Terminer plus tard » : rien n'est marqué comme fait, mais le projet
 * existe (sa clé sert à la ligne de script) et la connexion suivante mène au tableau de bord, qui
 * rappelle les étapes restantes.
 */
export async function skipSetup(): Promise<Result<{ siteKey: string }>> {
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase
    .from("projects")
    .upsert(
      { owner_id: user.id, setup_skipped_at: new Date().toISOString() },
      { onConflict: "owner_id" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, message: SAVE_ERROR };
  return { ok: true, data: { siteKey: data.id.slice(0, 8) } };
}

/**
 * Étape 1 : script détecté. En démonstration la détection est simulée côté interface ;
 * avec la collecte réelle, c'est la première visite reçue qui appellera cette mise à jour.
 */
export async function markScriptDetected(): Promise<Result<null>> {
  // En production, seule une vraie visite reçue par /api/collect marque le script comme installé.
  if (!isDemoMode()) return { ok: false, message: SIMULATION_OFF };
  const { supabase, user } = await authenticatedClient();
  // upsert : l'étape peut être reprise depuis le tableau de bord avant que le projet existe.
  const { error } = await supabase
    .from("projects")
    .upsert(
      { owner_id: user.id, script_detected_at: new Date().toISOString() },
      { onConflict: "owner_id" },
    );
  return error ? { ok: false, message: SAVE_ERROR } : { ok: true, data: null };
}

/** Étape 2, sans clés Stripe (poste de développement) : connexion simulée. */
export async function connectStripe(): Promise<Result<null>> {
  // En production, seul le retour OAuth de Stripe (/api/stripe/callback) relie un compte.
  if (!isDemoMode()) return { ok: false, message: SIMULATION_OFF };
  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase
    .from("projects")
    .upsert(
      { owner_id: user.id, stripe_connected_at: new Date().toISOString() },
      { onConflict: "owner_id" },
    );
  return error ? { ok: false, message: SAVE_ERROR } : { ok: true, data: null };
}

/** Une vérification toutes les 10 secondes au plus, par compte (mémoire du serveur). */
const VERIFY_INTERVAL_MS = 10_000;
const lastVerify = new Map<string, number>();

/**
 * « C'est fait, vérifier mon site » : lit la page d'accueil et y cherche la ligne SaasClair avec
 * la bonne clé. Trouvée : l'étape est validée tout de suite, sans attendre une visite.
 */
export async function verifyScriptInstall(): Promise<
  Result<{ status: InstallStatus; message: string }>
> {
  const user = await getUser();
  if (!user) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  const now = Date.now();
  if (now - (lastVerify.get(user.id) ?? 0) < VERIFY_INTERVAL_MS) {
    return { ok: false, message: "Vérification en cours. Réessayez dans quelques secondes." };
  }
  lastVerify.set(user.id, now);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, site_url, script_detected_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project?.site_url) {
    return { ok: false, message: "Ajoutez d'abord l'adresse de votre site." };
  }
  const page = await fetchHomepage(project.site_url);
  const { status } = checkInstall(page?.html ?? null, project.id.slice(0, 8));
  if (status === "ok" && !project.script_detected_at) {
    await supabase
      .from("projects")
      .update({ script_detected_at: new Date().toISOString() })
      .eq("owner_id", user.id);
  }
  return { ok: true, data: { status, message: INSTALL_MESSAGES[status] } };
}

export type BillingProvider = "paddle" | "lemonsqueezy" | "none";
const PROVIDER_MESSAGES: Record<BillingProvider, string> = {
  paddle:
    "C'est noté : nous vous écrirons dès que Paddle sera disponible. Vos visites et votre tunnel fonctionnent déjà.",
  lemonsqueezy:
    "C'est noté : nous vous écrirons dès que Lemon Squeezy sera disponible. Vos visites et votre tunnel fonctionnent déjà.",
  none: "Pas de souci : vos visites et votre tunnel fonctionnent déjà. Connectez Stripe le jour de votre premier client, depuis votre tableau de bord.",
};

/**
 * « Je n'utilise pas Stripe » : la réponse est enregistrée (liste d'attente Paddle et
 * Lemon Squeezy), l'étape est passée, et le tableau de bord la rappellera plus tard.
 */
export async function setBillingProvider(
  provider: BillingProvider,
): Promise<Result<{ message: string; siteKey: string }>> {
  if (!Object.hasOwn(PROVIDER_MESSAGES, provider)) return { ok: false, message: SAVE_ERROR };
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase
    .from("projects")
    .upsert(
      {
        owner_id: user.id,
        billing_provider: provider,
        setup_skipped_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, message: SAVE_ERROR };
  return { ok: true, data: { message: PROVIDER_MESSAGES[provider], siteKey: data.id.slice(0, 8) } };
}
