import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { stripeConfig } from "@/features/stripe/client";
import { syncAllStripeAccounts } from "@/features/stripe/sync";

/** Le secret de la tâche programmée, comparé à durée constante. */
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || received.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(secret));
}

/**
 * Resynchronisation de tous les comptes Stripe, appelée chaque heure par le serveur
 * (deploy/scripts/stripe-sync.sh, secret CRON_SECRET). Répond aussitôt ; l'import tourne après.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = stripeConfig();
  if (!config) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  after(() => syncAllStripeAccounts(config));
  return NextResponse.json({ status: "started" }, { status: 202 });
}
