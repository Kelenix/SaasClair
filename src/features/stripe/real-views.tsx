import { CreditCard, Info, Wallet } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Card } from "@/components/ui/card";
import type { Kpi } from "@/features/dashboard/demo-data";
import { CohortHeatmap } from "@/features/dashboard/churn/cohort-heatmap";
import { DepartureReasons } from "@/features/dashboard/churn/departure-reasons";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { MrrChart, RevenueFlows } from "@/features/dashboard/revenue/revenue-views";
import { formatEuro, formatNumber, formatPercent } from "@/lib/format";
import type { FailedInvoice, RealRevenue } from "./metrics";
import { RiskList } from "./risk-list";

export { RiskList };

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
const plural = (count: number, word: string) =>
  `${formatNumber(count)} ${word}${count > 1 ? "s" : ""}`;

/** Indicateurs clés tirés de Stripe, par nom (chaque écran choisit les siens). */
export function revenueKpi(data: RealRevenue) {
  const lost = data.lostCustomerNames.length;
  return {
    mrr: {
      id: "mrr",
      label: "Revenu mensuel récurrent",
      value: data.mrr,
      format: "euro",
      delta: plural(data.activeSubscriptions, "abonnement"),
      isGood: null,
      trend: trend(data),
    },
    churn: {
      id: "churn",
      label: "Churn mensuel",
      value: data.customerChurn,
      format: "percent",
      delta: `par mois · ${plural(lost, "client")} parti${lost > 1 ? "s" : ""} sur la période`,
      isGood: data.customerChurn === 0 ? true : null,
      trend: trend(data),
    },
    atRisk: {
      id: "at-risk",
      label: "Revenu à risque",
      value: data.mrrAtRisk,
      format: "euro",
      delta: plural(data.atRisk.length, "client"),
      isGood: data.atRisk.length ? false : true,
      trend: trend(data),
    },
    newMrr: {
      id: "new",
      label: "Nouveau revenu",
      value: data.newMrr,
      format: "euro",
      delta: "nouveaux clients sur la période",
      isGood: data.newMrr > 0 ? true : null,
      trend: trend(data),
    },
    trials: data.trialConversion && {
      id: "trial-conversion",
      label: "Conversion essai → payant",
      value: data.trialConversion.rate,
      format: "percent",
      delta: `${formatNumber(data.trialConversion.converted)} sur ${plural(data.trialConversion.ended, "essai")} terminé${data.trialConversion.ended > 1 ? "s" : ""}`,
      isGood: null,
      trend: trend(data),
    },
    // Sans départ mesuré, la durée de vie est inconnue : le revenu moyen par client à la place.
    lifetime:
      data.ltv !== null && data.lifetimeMonths !== null
        ? {
            id: "ltv",
            label: "Valeur vie client",
            value: data.ltv,
            format: "euro",
            delta: `${formatEuro(data.arpa)} par mois pendant ${formatNumber(data.lifetimeMonths)} mois en moyenne`,
            isGood: null,
            trend: trend(data),
          }
        : {
            id: "arpa",
            label: "Revenu moyen par client",
            value: data.arpa,
            format: "euro",
            delta: "par mois · aucun départ mesuré pour estimer la durée de vie",
            isGood: null,
            trend: trend(data),
          },
  } satisfies Record<string, Kpi | null>;
}

/** Indicateurs clés de l'accueil, sur les vraies données Stripe. */
export function revenueKpis(data: RealRevenue): Kpi[] {
  const kpi = revenueKpi(data);
  // Conversion des essais quand il y en a eu sur la période, sinon le nouveau revenu.
  return [kpi.mrr, kpi.churn, kpi.atRisk, kpi.trials ?? kpi.newMrr];
}

/**
 * Ce que les chiffres ne comptent pas, dit honnêtement : autre devise, prix à l'usage sans
 * facture. Rien ne s'affiche quand tout est compté.
 */
export function RevenueNotes({ data }: { data: RealRevenue }) {
  const notes: string[] = [];
  if (data.currency !== "eur") {
    notes.push(
      `Montants calculés dans la devise de vos abonnements (${data.currency.toUpperCase()}), affichés avec le symbole €.`,
    );
  }
  if (data.otherCurrencies.count) {
    notes.push(
      `${plural(data.otherCurrencies.count, "abonnement")} en ${data.otherCurrencies.currencies.join(", ")} ${data.otherCurrencies.count > 1 ? "ne sont" : "n'est"} pas compté${data.otherCurrencies.count > 1 ? "s" : ""} : nous n'additionnons jamais deux devises.`,
    );
  }
  if (data.usageBased.estimated) {
    notes.push(
      `${plural(data.usageBased.estimated, "abonnement")} à l'usage ou par paliers : revenu estimé sur la dernière facture.`,
    );
  }
  if (data.usageBased.missing) {
    notes.push(
      `${plural(data.usageBased.missing, "abonnement")} à l'usage ou par paliers sans facture encore : non estimé${data.usageBased.missing > 1 ? "s" : ""} pour l'instant.`,
    );
  }
  if (!notes.length) return null;
  return (
    <Card className="flex gap-3 text-sm text-slate" data-icon-trigger>
      <Icon icon={Info} anim="pop" className="mt-0.5 size-4 shrink-0 text-forest" />
      <ul className="space-y-1">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </Card>
  );
}

export function RealRevenueView({ data }: { data: RealRevenue }) {
  if (!hasRevenueData(data)) return <EmptyStripe what="Votre revenu et ses mouvements" />;
  return (
    <>
      <KpiCards
        kpis={[
          revenueKpi(data).mrr,
          revenueKpi(data).newMrr,
          revenueKpi(data).lifetime,
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
      <RevenueNotes data={data} />
      <SectionTitle
        title="Évolution et mouvements"
        detail={
          <p className="text-sm text-slate">Montants réellement facturés, remises déduites.</p>
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
              detail: "premiers paiements",
              amount: data.newMrr,
            },
            {
              id: "expansion",
              label: "Expansion",
              detail: "offres ou quantités en hausse",
              amount: data.expansionMrr,
            },
            {
              id: "contraction",
              label: "Contraction",
              detail: "offres ou quantités en baisse",
              amount: -data.contractionMrr,
            },
            {
              id: "churn",
              label: "Départs",
              detail: "clients partis",
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

export function RealChurnView({
  data,
  sender,
  initialOpenId,
}: {
  data: RealRevenue;
  sender: string;
  initialOpenId?: string;
}) {
  if (!hasRevenueData(data)) return <EmptyStripe what="Votre churn et vos clients à risque" />;
  return (
    <>
      <KpiCards
        kpis={[
          revenueKpi(data).churn,
          {
            id: "revenue-churn",
            label: "Churn en revenu mensuel",
            value: data.revenueChurn,
            format: "percent",
            delta: `par mois · ${formatEuro(data.churnedMrr + data.contractionMrr)} perdus sur la période (départs et baisses d'offre)`,
            isGood: data.revenueChurn === 0 ? true : null,
            trend: trend(data),
          },
          revenueKpi(data).atRisk,
          {
            id: "involuntary",
            label: "Paiements à récupérer",
            value: data.failedAmount,
            format: "euro",
            delta: "factures échouées encore ouvertes",
            isGood: data.failedInvoices.length ? false : true,
            trend: trend(data),
          },
        ]}
      />
      <SectionTitle
        title="Qui risque de partir"
        detail={
          <p className="text-sm text-slate">
            Signaux réels de Stripe. Cliquez sur un client pour voir sa fiche.
          </p>
        }
      />
      <RiskList customers={data.atRisk} sender={sender} initialOpenId={initialOpenId} />
      {data.departures.total > 0 && (
        <>
          <SectionTitle
            title="Pourquoi ils partent"
            detail={
              <p className="text-sm text-slate">
                {data.departures.total} client{data.departures.total > 1 ? "s" : ""} parti
                {data.departures.total > 1 ? "s" : ""} sur la période.
              </p>
            }
          />
          <DepartureReasons
            reasons={{
              declared: data.departures.declared,
              declaredBasis: data.departures.answered
                ? `${data.departures.answered} réponse${data.departures.answered > 1 ? "s" : ""} au portail de résiliation Stripe`
                : "Aucune réponse au portail de résiliation Stripe",
              observed: data.departures.observed,
              observedBasis: "D'après Stripe : paiements et dates de chaque départ",
            }}
            tip={data.departures.tip}
          />
        </>
      )}
      {data.cohorts.some((cohort) => cohort.retention.length > 1) && (
        <>
          <SectionTitle
            title="Rétention par cohorte"
            detail={
              <p className="text-sm text-slate">
                Clients regroupés par mois de leur premier paiement
                {data.lifetimeMonths !== null &&
                  ` · durée de vie moyenne : ${formatNumber(data.lifetimeMonths)} mois (churn de ${formatPercent(data.customerChurn)} par mois)`}
                .
              </p>
            }
          />
          <CohortHeatmap cohorts={data.cohorts} />
        </>
      )}
    </>
  );
}
