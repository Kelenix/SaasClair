"use server";

import { stripeConfig } from "@/features/stripe/client";
import { SITE_URL } from "@/lib/site";
import { getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isPaidPlan, lookupKey, type Interval } from "./plans";
import {
  createCheckoutSession,
  createCustomer,
  createPortalSession,
  findPriceId,
} from "./stripe-api";

type Result = { ok: true; url: string } | { ok: false; message: string };

const UNAVAILABLE = "Le paiement en ligne n'est pas encore ouvert. Réessayez dans un instant.";
const RETURN = `${SITE_URL}/app/parametres?onglet=abonnement`;

async function billingProfile() {
  const user = await getUser();
  const service = createServiceClient();
  if (!user || !service || !stripeConfig()) return null;
  const { data: profile } = await service
    .from("profiles")
    .select("email, first_name, stripe_customer_id, stripe_subscription_id, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  return profile ? { user, service, profile } : null;
}

/**
 * « Choisir cette offre » : page de paiement Stripe. Un client déjà abonné va au portail, pour
 * changer d'offre sans créer un second abonnement.
 */
export async function startCheckout(plan: string, interval: Interval): Promise<Result> {
  if (!isPaidPlan(plan) || (interval !== "monthly" && interval !== "annual")) {
    return { ok: false, message: "Offre inconnue." };
  }
  const context = await billingProfile();
  if (!context) return { ok: false, message: UNAVAILABLE };
  const { user, service, profile } = context;
  try {
    if (profile.stripe_subscription_id && profile.subscription_status !== "canceled") {
      return await openPortal();
    }
    const price = await findPriceId(lookupKey(plan, interval));
    if (!price) return { ok: false, message: UNAVAILABLE };

    let customer = profile.stripe_customer_id;
    if (!customer) {
      customer = await createCustomer({
        email: profile.email,
        name: profile.first_name,
        userId: user.id,
      });
      await service.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
    }
    const url = await createCheckoutSession({
      customer,
      price,
      userId: user.id,
      successUrl: `${RETURN}&paiement=ok`,
      cancelUrl: `${RETURN}&paiement=annule`,
    });
    return { ok: true, url };
  } catch (error) {
    console.error("Paiement :", error instanceof Error ? error.message : error);
    return { ok: false, message: UNAVAILABLE };
  }
}

/** « Gérer mon abonnement » : portail client Stripe. */
export async function openPortal(): Promise<Result> {
  const context = await billingProfile();
  if (!context?.profile.stripe_customer_id) {
    return { ok: false, message: "Aucun abonnement à gérer pour l'instant." };
  }
  try {
    const url = await createPortalSession({
      customer: context.profile.stripe_customer_id,
      returnUrl: RETURN,
    });
    return { ok: true, url };
  } catch (error) {
    console.error("Portail :", error instanceof Error ? error.message : error);
    return { ok: false, message: UNAVAILABLE };
  }
}
