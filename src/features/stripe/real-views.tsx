import { CreditCard, HeartPulse, Wallet } from "lucide-react";
import { GrowBar } from "@/components/data/grow-bar";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Kpi } from "@/features/dashboard/demo-data";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { MrrChart, RevenueFlows } from "@/features/dashboard/revenue/revenue-views";
import { formatEuro, formatNumber } from "@/lib/format";
import { STAGGER } from "@/lib/motion";
import type { AtRisk, FailedInvoice, RealRevenue } from "./metrics";

const dayMonth = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;

/** Stripe connecté mais vide : aucun abonnement à analyser, on le dit simplement. */
export const hasRevenueData = (data: RealRevenue) =>
  data.activeSubscriptions > 0 || data.history.some((point) => point.mrr > 0) || data.trialing > 0;

export function EmptyStripe({ what }: { what: string }) {
  return (
    <Card>
      <StateMessage
        icon={CreditCard}
        title="Stripe est connecté."
        description={`Aucun abonnement n'y figure pour l'instant. ${what} apparaîtront ici dès votre premier abonnement.`}
      />
    </Card>
  );
}

/** Clients à risque : vraies raisons tirées de Stripe (résiliation, impayé, échec de paiement). */
export function RiskList({ customers, limit }: { customers: AtRisk[]; limit?: number }) {
  const shown = limit ? customers.slice(0, limit) : customers;
  if (!shown.length) {
    return (
      <Card>
        <StateMessage
          icon={HeartPulse}
          title="Aucun client à risque."
          description="Aucune résiliation programmée, aucun impayé, aucun paiement échoué. Nous vous prévenons dès qu'un signal apparaît."
        />
      </Card>
    );
  }
  return (
    <Card className="p-0">
      <ol className="divide-y divide-line">
        {shown.map((customer, index) => (
          <li
            key={customer.customerId}
            className="grid grid-cols-1 gap-3 px-6 py-4 @3xl:grid-cols-[1.4fr_0.6fr_1fr] @3xl:items-center"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{customer.name}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {customer.reasons.map((reason) => (
                  <li key={reason.kind}>
                    <Badge tone="attention">{reason.label}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-ink tabular-nums">
              <span className="font-semibold text-forest">{formatEuro(customer.mrr)}</span> / mois
              {customer.periodEnd && (
                <span className="block text-xs text-slate">
                  Échéance le {dayMonth(customer.periodEnd)}
                </span>
              )}
            </p>
            <div>
              <p className="mb-1.5 flex justify-between text-xs text-slate">
                <span>Risque de départ</span>
                <span className="font-semibold text-gold-ink tabular-nums">{customer.score} %</span>
              </p>
              <GrowBar share={customer.score} tone="gold" delay={index * STAGGER} />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Paiements échoués : Stripe retente lui-même ; rien n'est envoyé par SaasClair. */
export function FailedInvoices({ invoices }: { invoices: FailedInvoice[] }) {
  if (!invoices.length) {
    return (
      <Card>
        <StateMessage
          icon={Wallet}
          title="Aucun paiement échoué."
          description="Toutes vos factures récentes ont été payées."
        />
      </Card>
    );
  }
  return (
    <Card className="p-0">
      <ol className="divide-y divide-line">
        {invoices.map((invoice) => (
          <li
            key={invoice.id}
            className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-4 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{invoice.customer}</span>
              <span className="text-xs text-slate">
                {formatNumber(invoice.attempts)} tentative{invoice.attempts > 1 ? "s" : ""}
                {invoice.nextAttempt &&
                  ` · nouvel essai de Stripe le ${dayMonth(invoice.nextAttempt)}`}
              </span>
            </span>
            <span className="font-semibold text-gold-ink tabular-nums">
              {formatEuro(invoice.amount)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const trend = (data: RealRevenue) => data.history.map((point) => point.mrr);

/** Indicateurs clés de l'accueil, sur les vraies données Stripe. */
export function revenueKpis(data: RealRevenue): Kpi[] {
  return [
    {
      id: "mrr",
      label: "Revenu mensuel récurrent",
      value: data.mrr,
      format: "euro",
      delta: `${formatNumber(data.activeSubscriptions)} abonnement${data.activeSubscriptions > 1 ? "s" : ""}`,
      isGood: null,
      trend: trend(data),
    },
    {
      id: "churn",
      label: "Taux de churn",
      value: data.customerChurn,
      format: "percent",
      delta: "sur la période",
      isGood: data.customerChurn === 0 ? true : null,
      trend: trend(data),
    },
    {
      id: "at-risk",
      label: "Revenu à risque",
      value: data.mrrAtRisk,
      format: "euro",
      delta: `${formatNumber(data.atRisk.length)} client${data.atRisk.length > 1 ? "s" : ""}`,
      isGood: data.atRisk.length ? false : true,
      trend: trend(data),
    },
    {
      id: "new",
      label: "Nouveau revenu",
      value: data.newMrr,
      format: "euro",
      delta: "sur la période",
      isGood: data.newMrr > 0 ? true : null,
      trend: trend(data),
    },
  ];
}

export function RealRevenueView({ data }: { data: RealRevenue }) {
  if (!hasRevenueData(data)) return <EmptyStripe what="Votre revenu et ses mouvements" />;
  return (
    <>
      <KpiCards
        kpis={[
          revenueKpis(data)[0],
          { ...revenueKpis(data)[3] },
          {
            id: "lost",
            label: "Revenu perdu",
            value: data.churnedMrr,
            format: "euro",
            delta: "abonnements arrêtés sur la période",
            isGood: data.churnedMrr === 0 ? true : false,
            trend: trend(data),
          },
          {
            id: "failed",
            label: "Paiements échoués",
            value: data.failedAmount,
            format: "euro",
            delta: `${formatNumber(data.failedInvoices.length)} facture${data.failedInvoices.length > 1 ? "s" : ""} à récupérer`,
            isGood: data.failedInvoices.length ? false : true,
            trend: trend(data),
          },
        ]}
      />
      <SectionTitle
        title="Évolution et mouvements"
        detail={
          <p className="text-sm text-slate">
            Expansion et contraction : bientôt, avec l&apos;historique des changements d&apos;offre.
          </p>
        }
      />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[1.5fr_1fr]">
        <MrrChart startMrr={data.history[0]?.mrr ?? 0} history={data.history} />
        <RevenueFlows
          startMrr={data.startMrr}
          flows={[
            {
              id: "new",
              label: "Nouveaux clients",
              detail: "abonnements démarrés",
              amount: data.newMrr,
            },
            {
              id: "churn",
              label: "Départs",
              detail: "abonnements arrêtés",
              amount: -data.churnedMrr,
            },
          ]}
        />
      </div>
      <SectionTitle
        title="Argent à récupérer"
        detail={
          <p className="text-sm text-slate">Stripe retente automatiquement les cartes refusées.</p>
        }
      />
      <FailedInvoices invoices={data.failedInvoices} />
    </>
  );
}

export function RealChurnView({ data }: { data: RealRevenue }) {
  if (!hasRevenueData(data)) return <EmptyStripe what="Votre churn et vos clients à risque" />;
  return (
    <>
      <KpiCards
        kpis={[
          revenueKpis(data)[1],
          {
            id: "revenue-churn",
            label: "Churn en revenu",
            value: data.revenueChurn,
            format: "percent",
            delta: `${formatEuro(data.churnedMrr)} perdus sur la période`,
            isGood: data.revenueChurn === 0 ? true : null,
            trend: trend(data),
          },
          revenueKpis(data)[2],
          {
            id: "involuntary",
            label: "Churn involontaire",
            value: data.failedAmount,
            format: "euro",
            delta: "en paiements échoués",
            isGood: data.failedInvoices.length ? false : true,
            trend: trend(data),
          },
        ]}
      />
      <SectionTitle
        title="Qui risque de partir"
        detail={
          <p className="text-sm text-slate">
            Signaux réels de Stripe : résiliation, impayé, paiement échoué.
          </p>
        }
      />
      <RiskList customers={data.atRisk} />
    </>
  );
}
