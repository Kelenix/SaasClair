import { NextResponse, type NextRequest } from "next/server";
import { profileUpdate, verifyStripeSignature } from "@/features/billing/apply";
import { retrieveSubscription } from "@/features/billing/stripe-api";
import { createServiceClient } from "@/lib/supabase/service";

// Notifications de Stripe sur l'abonnement de SaasClair (paiement, changement d'offre, échec,
// résiliation) : signature vérifiée, chaque notification appliquée une seule fois, profil mis à
// jour depuis l'état actuel de l'abonnement chez Stripe (jamais depuis le seul message). ADR-027.

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      object?: string;
      subscription?: string | null;
      client_reference_id?: string | null;
      parent?: { subscription_details?: { subscription?: string | null } | null } | null;
    };
  };
};

function subscriptionIdOf(event: StripeEvent) {
  const object = event.data.object;
  if (object.object === "subscription") return object.id ?? null;
  return object.subscription ?? object.parent?.subscription_details?.subscription ?? null;
}

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const service = createServiceClient();
  if (!secret || !service) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const payload = await request.text();
  if (
    !verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret, new Date())
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  // Une notification renvoyée par Stripe n'est appliquée qu'une fois.
  const { error: duplicate } = await service
    .from("billing_events")
    .insert({ id: event.id, type: event.type });
  if (duplicate) return NextResponse.json({ received: true, duplicate: true });

  try {
    const subscriptionId = subscriptionIdOf(event);
    if (!subscriptionId) return NextResponse.json({ received: true });
    const subscription = await retrieveSubscription(subscriptionId);
    const update = profileUpdate(subscription);
    if (!update) return NextResponse.json({ received: true });

    // Le profil : par son client Stripe, sinon par l'identifiant posé au paiement.
    const userId = event.data.object.client_reference_id ?? subscription.metadata?.user_id ?? null;
    const byCustomer = await service
      .from("profiles")
      .update(update)
      .eq("stripe_customer_id", update.stripe_customer_id)
      .select("id");
    // Écriture refusée : erreur, pour que Stripe rejoue la notification (sinon perdue).
    if (byCustomer.error) throw new Error(`profil non mis à jour (${byCustomer.error.code})`);
    if (!byCustomer.data?.length && userId) {
      const byUser = await service.from("profiles").update(update).eq("id", userId);
      if (byUser.error) throw new Error(`profil non mis à jour (${byUser.error.code})`);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Échec : la notification sera rejouée par Stripe, donc on l'oublie.
    console.error("Notification Stripe :", error instanceof Error ? error.message : error);
    await service.from("billing_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
