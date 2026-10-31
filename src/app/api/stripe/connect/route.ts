import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeUrl, stripeConfig } from "@/features/stripe/client";
import { STRIPE_STATE_COOKIE } from "@/features/stripe/oauth-state";
import { SITE_URL } from "@/lib/site";
import { getUser } from "@/lib/supabase/server";

/**
 * « Connecter Stripe » : départ vers la page d'autorisation de Stripe. Un jeton
 * aléatoire, gardé dans un cookie, protège le retour contre les connexions forgées.
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/connexion?next=/configuration?etape=stripe", SITE_URL));
  }
  const config = stripeConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/configuration?etape=stripe&stripe=indisponible", SITE_URL),
    );
  }
  const state = randomBytes(24).toString("hex");
  (await cookies()).set(STRIPE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: SITE_URL.startsWith("https://"),
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/api/stripe",
  });
  return NextResponse.redirect(authorizeUrl(config, state, `${SITE_URL}/api/stripe/callback`));
}
