import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { stripeConfig } from "@/features/stripe/client";
import { refreshStaleAudits } from "@/features/setup/refresh";
import { syncAllStripeAccounts } from "@/features/stripe/sync";

/** Le secret de la tâche programmée, comparé à durée constante. */
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || received.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(secret));
}

/**
 * Tâche horaire (deploy/scripts/stripe-sync.sh, secret CRON_SECRET) : resynchronise tous les
 * comptes Stripe, puis réanalyse les sites dont l'analyse a plus de 6 heures. Répond aussitôt ;
 * le travail tourne après.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = stripeConfig();
  after(async () => {
    if (config) await syncAllStripeAccounts(config);
    await refreshStaleAudits();
  });
  if (!config) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  return NextResponse.json({ status: "started" }, { status: 202 });
}
