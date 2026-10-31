import { Gift } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { PaymentReturn } from "@/features/billing/payment-return";
import { PlanChooser, PortalButton } from "@/features/billing/plan-chooser";
import {
  PLAN_LABEL,
  TRIAL_DAYS,
  trialDaysLeft,
  VISIT_LIMIT,
  type Access,
} from "@/features/billing/plans";
import type { DashboardContext } from "@/features/dashboard/context";
import { formatNumber } from "@/lib/format";

const METHOD_LABEL: Record<string, string> = {
  card: "Carte bancaire",
  sepa: "Prélèvement SEPA",
  paypal: "PayPal",
  bank_transfer: "Virement",
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type BillingPanelProps = {
  billing: DashboardContext["billing"];
  access: Access;
  /** Pages vues reçues ce mois-ci par le script (vraies données). */
  pageviewsThisMonth: number;
  paymentResult: string | null;
  now: Date;
};

/** Abonnement et facturation, sur les vraies données du compte (paiement : Stripe, ADR-027). */
export function BillingPanel({
  billing,
  access,
  pageviewsThisMonth,
  paymentResult,
  now,
}: BillingPanelProps) {
  const plan = (billing.plan in VISIT_LIMIT ? billing.plan : "trial") as keyof typeof VISIT_LIMIT;
  const limit = VISIT_LIMIT[plan];
  const daysLeft = trialDaysLeft(billing.trialEndsAt, now);
  const isPaid = access === "paid" || access === "past_due";

  return (
    <div className="space-y-4">
      <PaymentReturn result={paymentResult} isPaid={access === "paid"} />
      <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CardEyebrow>Votre abonnement</CardEyebrow>
              <p className="font-serif text-xl font-semibold text-forest">
                {isPaid
                  ? `${PLAN_LABEL[plan]} · ${billing.interval === "annual" ? "annuel" : "mensuel"}`
                  : access === "trial"
                    ? "Essai gratuit de l'offre Growth"
                    : "Aucun abonnement en cours"}
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-tint text-gold-ink">
              <Icon icon={Gift} anim="bounce" />
            </span>
          </div>

          {access === "trial" && (
            <>
              <p className="mb-2 text-[15px] text-ink">
                Il vous reste {daysLeft} jour{daysLeft > 1 ? "s" : ""} d&apos;essai, sans carte
                bancaire. Choisissez votre offre quand vous voulez.
              </p>
              <GrowBar
                share={(Math.max(0, TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100}
                tone="gold"
              />
              <p className="mt-1.5 text-xs text-slate">
                Fin de l&apos;essai le {longDate(billing.trialEndsAt)}
              </p>
            </>
          )}
          {isPaid && (
            <ul className="mb-4 space-y-1.5 text-[15px] text-ink">
              {access === "past_due" && (
                <li>
                  <Badge tone="attention">Paiement en échec</Badge> Stripe retente le paiement :
                  mettez à jour votre moyen de paiement.
                </li>
              )}
              {billing.periodEnd && (
                <li>
                  {billing.cancelAtPeriodEnd
                    ? `Résiliation programmée : accès jusqu'au ${longDate(billing.periodEnd)}.`
                    : `Prochain renouvellement le ${longDate(billing.periodEnd)}.`}
                </li>
              )}
              {billing.paymentMethod && (
                <li className="text-sm text-slate">
                  Moyen de paiement : {METHOD_LABEL[billing.paymentMethod] ?? billing.paymentMethod}
                </li>
              )}
            </ul>
          )}
          {access === "expired" && (
            <p className="mb-2 text-[15px] text-ink">
              Votre essai est terminé. Vos données sont conservées : choisissez votre offre pour
              retrouver votre tableau de bord.
            </p>
          )}
          {billing.hasStripeCustomer && (
            <div className="mt-4">
              <PortalButton />
            </div>
          )}
        </Card>

        <Card>
          <CardEyebrow>Usage ce mois-ci</CardEyebrow>
          <p className="mb-5 font-serif text-xl font-semibold text-forest">
            {formatNumber(pageviewsThisMonth)} page{pageviewsThisMonth > 1 ? "s" : ""} vue
            {pageviewsThisMonth > 1 ? "s" : ""}
          </p>
          {limit ? (
            <>
              <GrowBar share={Math.min(100, (pageviewsThisMonth / limit) * 100)} />
              <p className="mt-2 text-sm text-slate">
                Sur {formatNumber(limit)} visites (pages vues) incluses chaque mois{" "}
                {plan === "trial" ? "pendant l'essai" : `dans l'offre ${PLAN_LABEL[plan]}`}.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate">Volume illimité avec l&apos;offre Pro.</p>
          )}
        </Card>
      </div>

      {!isPaid && (
        <div className="@container">
          <PlanChooser />
        </div>
      )}
    </div>
  );
}
