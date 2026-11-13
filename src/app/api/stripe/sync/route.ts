import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { stripeConfig } from "@/features/stripe/client";
import { purgeOldEvents } from "@/features/collect/retention";
import { refreshStaleAudits } from "@/features/setup/refresh";
import { isDemoMode } from "@/lib/demo-mode";
import { syncAllStripeAccounts } from "@/features/stripe/sync";
import { sendDueAlerts } from "@/features/alerts/run";

/** Le secret de la tâche programmée, comparé à durée constante. */
function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || received.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(secret));
}

/**
 * Tâche horaire (deploy/scripts/stripe-sync.sh, secret CRON_SECRET) : resynchronise tous les
 * comptes Stripe, réanalyse les sites dont l'analyse a plus de 6 heures, efface les visites de
 * plus de 25 mois et envoie les alertes nouvelles. Répond aussitôt ; le travail tourne après.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = stripeConfig();
  after(async () => {
    if (config) await syncAllStripeAccounts(config);
    // En démonstration (poste local, CI), les analyses automatiques sont coupées, comme sur
    // l'accueil : elles remplaceraient l'exemple du compte de démonstration.
    if (!isDemoMode()) await refreshStaleAudits();
    // Conservation limitée (RGPD) : les visites de plus de 25 mois sont effacées.
    await purgeOldEvents();
    // Alertes par email et Slack (jamais en démonstration : rien ne doit partir d'un exemple).
    if (!isDemoMode()) await sendDueAlerts();
  });
  if (!config) return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  return NextResponse.json({ status: "started" }, { status: 202 });
}
