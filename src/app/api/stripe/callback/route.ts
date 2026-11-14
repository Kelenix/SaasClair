import { cookies } from "next/headers";
import { after, NextResponse, type NextRequest } from "next/server";
import { deauthorizeAccount, exchangeCode, stripeConfig } from "@/features/stripe/client";
import { sameState, STRIPE_STATE_COOKIE, type StripeResult } from "@/features/stripe/oauth-state";
import { syncStripeAccount } from "@/features/stripe/sync";
import { SITE_URL } from "@/lib/site";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const back = (result: StripeResult) =>
  NextResponse.redirect(new URL(`/configuration?etape=stripe&stripe=${result}`, SITE_URL));

/**
 * Retour de Stripe après l'autorisation : vérifie le jeton, récupère le compte Stripe du client,
 * le relie à son projet, puis lance l'import après la réponse (l'étape suit son avancement).
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/connexion", SITE_URL));

  const jar = await cookies();
  const expected = jar.get(STRIPE_STATE_COOKIE)?.value;
  jar.delete({ name: STRIPE_STATE_COOKIE, path: "/api/stripe" });

  const { searchParams } = request.nextUrl;
  if (searchParams.get("error")) return back("refuse");
  const code = searchParams.get("code");
  if (!code || !sameState(expected, searchParams.get("state"))) {
    console.error(
      `Retour Stripe refusé : ${code ? "jeton anti-falsification absent ou différent" : "code absent"}`,
    );
    return back("erreur");
  }

  const config = stripeConfig();
  const service = createServiceClient();
  if (!config || !service) return back("indisponible");

  const account = await exchangeCode(config, code);
  if (!account) return back("erreur");

  // Un compte Stripe ne se relie qu'à un seul projet.
  const { data: other } = await service
    .from("projects")
    .select("owner_id")
    .eq("stripe_account_id", account.accountId)
    .maybeSingle();
  if (other && other.owner_id !== user.id) return back("deja-relie");

  // Compte Stripe déjà relié à ce projet : changé si l'utilisateur en choisit un autre.
  const { data: previous } = await service
    .from("projects")
    .select("stripe_account_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: project, error } = await service
    .from("projects")
    .upsert(
      {
        owner_id: user.id,
        stripe_account_id: account.accountId,
        stripe_livemode: account.livemode,
        stripe_sync_status: "importing",
      },
      { onConflict: "owner_id" },
    )
    .select("id")
    .single();
  if (error) return back("erreur");

  // Autre compte qu'avant : les clients de l'ancien ne se mélangent pas aux nouveaux, et
  // SaasClair n'y a plus accès.
  const replaced = previous?.stripe_account_id;
  if (replaced && replaced !== account.accountId) {
    for (const table of ["stripe_invoices", "stripe_subscriptions", "stripe_customers"] as const) {
      const { error: purge } = await service.from(table).delete().eq("project_id", project.id);
      if (purge) return back("erreur");
    }
    after(() => deauthorizeAccount(config, replaced));
  }

  after(() => syncStripeAccount(config, project.id, account.accountId));
  return back("ok");
}
