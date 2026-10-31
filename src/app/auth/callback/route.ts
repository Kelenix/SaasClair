import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/features/attribution/attribution";
import { safeRedirectPath, withWelcome } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour de Google / GitHub, du lien de confirmation d'email ou de réinitialisation :
 * échange le code contre une session, puis envoie vers la page demandée (chemin interne uniquement).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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
      const isNewAccount = data.user && Date.now() - Date.parse(data.user.created_at) < 2 * 60_000;
      return NextResponse.redirect(new URL(isNewAccount ? withWelcome(next) : next, origin));
    }
  }
  return NextResponse.redirect(new URL("/connexion?erreur=lien", origin));
}
