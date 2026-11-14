import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/features/attribution/attribution";
import { safeRedirectPath, withWelcome } from "@/lib/safe-redirect";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour de Google / GitHub, du lien de confirmation d'email ou de réinitialisation :
 * échange le code contre une session, puis envoie vers la page demandée (chemin interne uniquement).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Adresse publique du site, pas celle de la requête : derrière Nginx, le serveur ne connaît que
  // son adresse interne (http://0.0.0.0:3000), et les redirections y menaient.
  const origin = SITE_URL;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    // Identifiant du parcours ajouté par Supabase au retour : la bonne clé de vérification est
    // relue, même si un autre parcours (lien par email, Google) est en attente.
    const flowId = searchParams.get("sb_flow_id");
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error) console.error("Retour de connexion refusé :", error.code ?? "", error.message);
    if (!error) {
      // Inscription par Google ou GitHub : la provenance est posée au retour (une seule fois).
      const attribution = parseAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
      if (attribution) {
        await supabase.rpc("claim_signup_attribution", {
          channel: attribution.channel,
          source: attribution.source ?? "",
          medium: attribution.medium ?? "",
          campaign: attribution.campaign ?? "",
          referrer: attribution.referrer ?? "",
          landing: attribution.landing ?? "",
        });
      }
      const { data } = await supabase.auth.getUser();
      // Nouveau compte : créé à l'instant (Google, GitHub), ou email confirmé à l'instant (le clic
      // sur le lien peut venir bien après la création du compte).
      const isRecent = (iso?: string | null) =>
        Boolean(iso) && Date.now() - Date.parse(iso!) < 2 * 60_000;
      const isNewAccount =
        data.user && (isRecent(data.user.created_at) || isRecent(data.user.email_confirmed_at));
      return NextResponse.redirect(new URL(isNewAccount ? withWelcome(next) : next, origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", origin));
}
