import "server-only";
import { cancelSubscriptionNow } from "@/features/billing/stripe-api";
import { deauthorizeAccount, stripeConfig } from "@/features/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";

export type EraseResult = { ok: true } | { ok: false; message: string };

/**
 * Efface un compte et tout ce qui s'y rattache (projet, visites, données Stripe importées,
 * réglages, alertes, suivi des insights : suppression en cascade dans la base). Avant, dans cet
 * ordre, ce qui vit hors de la base :
 * 1. l'accès de SaasClair au Stripe du client est coupé chez Stripe ;
 * 2. son abonnement SaasClair est arrêté, pour qu'il ne soit plus jamais prélevé.
 * Si l'un des deux échoue, rien n'est effacé : le compte reste intact et l'on peut réessayer.
 * Utilisé par l'utilisateur (Paramètres › Confidentialité) et par le super administrateur.
 */
export async function eraseAccount(userId: string): Promise<EraseResult> {
  const service = createServiceClient();
  if (!service) return { ok: false, message: "Suppression indisponible pour le moment." };

  const [{ data: project }, { data: profile }] = await Promise.all([
    service.from("projects").select("stripe_account_id").eq("owner_id", userId).maybeSingle(),
    service
      .from("profiles")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const config = stripeConfig();
  if (project?.stripe_account_id && config) {
    const done = await deauthorizeAccount(config, project.stripe_account_id);
    if (!done) {
      return { ok: false, message: "Stripe n'a pas répondu : le compte est intact. Réessayez." };
    }
  }

  if (profile?.stripe_subscription_id && profile.subscription_status !== "canceled") {
    try {
      await cancelSubscriptionNow(profile.stripe_subscription_id);
    } catch (error) {
      console.error("Arrêt de l'abonnement :", error instanceof Error ? error.message : error);
      return {
        ok: false,
        message: "L'abonnement n'a pas pu être arrêté : le compte est intact. Réessayez.",
      };
    }
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) {
    console.error("Suppression du compte :", error.message);
    return { ok: false, message: "La suppression n'a pas abouti. Le compte est intact." };
  }
  return { ok: true };
}
