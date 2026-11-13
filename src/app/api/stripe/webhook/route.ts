import { after, NextResponse, type NextRequest } from "next/server";
import { verifyStripeSignature } from "@/features/billing/apply";
import { stripeConfig, type StripeConfig } from "@/features/stripe/client";
import { changesOf, type StripeEvent } from "@/features/stripe/normalize";
import { refreshStripeObjects, TRACKED_EVENTS } from "@/features/stripe/sync";
import { createServiceClient } from "@/lib/supabase/service";

// Notifications en temps réel des comptes Stripe connectés (point de réception « Connect »,
// créé par deploy/scripts/billing-setup.sh) : un paiement, une résiliation ou une carte changée
// se voit en quelques secondes, sans attendre le suivi horaire. Signature vérifiée ; l'objet est
// relu chez Stripe (jamais le seul message). La déconnexion depuis Stripe coupe le lien.

const TRACKED = new Set(TRACKED_EVENTS);
const ACCOUNT = /^acct_[A-Za-z0-9]+$/;
/** Notifications d'un même compte regroupées : une relecture pour une rafale. */
const GROUP_MS = 2000;
const queues = new Map<string, { events: StripeEvent[]; done: Promise<void> }>();

function queueRefresh(
  config: StripeConfig,
  projectId: string,
  account: string,
  event: StripeEvent,
) {
  const queued = queues.get(projectId);
  if (queued) {
    queued.events.push(event);
    return queued.done;
  }
  const entry = { events: [event], done: Promise.resolve() };
  entry.done = new Promise((resolve) => setTimeout(resolve, GROUP_MS))
    .then(() => {
      queues.delete(projectId);
      return refreshStripeObjects(config, projectId, account, changesOf(entry.events));
    })
    .catch((error) => {
      console.error("Notification Stripe :", error instanceof Error ? error.message : error);
    });
  queues.set(projectId, entry);
  return entry.done;
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const config = stripeConfig();
  const service = createServiceClient();
  if (!secret || !config || !service) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const payload = await request.text();
  if (
    !verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret, new Date())
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const event = JSON.parse(payload) as StripeEvent;
  const account = event.account;
  if (!account || !ACCOUNT.test(account)) return NextResponse.json({ received: true });

  const { data: project } = await service
    .from("projects")
    .select("id")
    .eq("stripe_account_id", account)
    .maybeSingle();
  if (!project) return NextResponse.json({ received: true });

  if (event.type === "account.application.deauthorized") {
    // Le client a retiré l'accès depuis Stripe : plus de lien, et ses données Stripe sont
    // effacées (elles ne seraient plus jamais à jour). Il peut reconnecter Stripe à tout moment.
    await Promise.all(
      (["stripe_invoices", "stripe_subscriptions", "stripe_customers"] as const).map((table) =>
        service.from(table).delete().eq("project_id", project.id),
      ),
    );
    await service
      .from("projects")
      .update({
        stripe_account_id: null,
        stripe_livemode: null,
        stripe_sync_status: null,
        stripe_synced_at: null,
        stripe_full_synced_at: null,
        stripe_connected_at: null,
      })
      .eq("id", project.id);
    return NextResponse.json({ received: true });
  }

  if (TRACKED.has(event.type)) {
    after(() => queueRefresh(config, project.id, account, event));
  }
  return NextResponse.json({ received: true });
}
