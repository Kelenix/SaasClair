import type { Metadata } from "next";
import { Suspense } from "react";
import { Lightbulb } from "lucide-react";
import { AlertSettingsPanel } from "@/features/dashboard/alerts/alert-settings";
import { getAlertSettings } from "@/features/dashboard/alerts/get-alert-settings";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import {
  getInsightHistory,
  summarize,
  type InsightEntry,
} from "@/features/dashboard/insights/history";
import { getRealInsights } from "@/features/insights/queries";
import { StateMessage } from "@/components/states/state-message";
import { Card } from "@/components/ui/card";
import { InsightList } from "@/features/dashboard/insights/insight-list";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "Insights et alertes" };

/** « 9 novembre » : le lundi de la semaine en cours. */
const mondayOf = (now: Date) => {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

async function Insights() {
  const [context, period, alerts] = await Promise.all([
    getDashboardContext(),
    getPeriod(),
    getAlertSettings(),
  ]);
  const alertsSection = (
    <>
      <SectionTitle
        title="Alertes"
        detail={<p className="text-sm text-slate">Toutes actives par défaut. Rien à configurer.</p>}
      />
      <AlertSettingsPanel initial={alerts} email={context.email} />
    </>
  );
  if (!context.demo) {
    const insights = await getRealInsights();
    const hasSource = Boolean(context.audit) || context.scriptDetected || context.stripeConnected;
    if (!insights.length) {
      return (
        <>
          {hasSource ? (
            <>
              <PageHeader
                title="Insights et alertes"
                summary="Rien ne demande votre attention cette semaine."
                period={period}
                liveLabel="Recalculés à chaque visite"
              />
              <Card>
                <StateMessage
                  icon={Lightbulb}
                  title="Rien à signaler cette semaine."
                  description="Paiements, départs, essais et site : tout va bien. Dès qu'un chiffre mérite votre attention, il apparaît ici avec l'action à faire."
                />
              </Card>
            </>
          ) : (
            <NoData
              title="Insights et alertes"
              icon={Lightbulb}
              needs="site"
              remaining={context.setupRemaining}
              description="Vos insights (constat, cause, action et argent en jeu) apparaissent ici dès l'analyse de votre site, puis avec vos visites et Stripe."
              waiting="Rien ne demande votre attention pour l'instant."
            />
          )}
          {alertsSection}
        </>
      );
    }
    const week = `Semaine du ${mondayOf(new Date())}`;
    const entries: InsightEntry[] = insights.map((insight) => ({
      ...insight,
      week,
      isCurrent: true,
      status: context.feedback[insight.id] ?? null,
      measured: null,
      measurable: false,
    }));
    const stats = summarize(entries);
    const atStake = entries
      .filter((entry) => entry.status === null)
      .reduce((total, entry) => total + entry.impactEuros, 0);
    const flat = (value: number) => [value, value];
    return (
      <>
        <PageHeader
          title="Insights et alertes"
          summary={
            stats.pending
              ? `${stats.pending} action${stats.pending > 1 ? "s" : ""} à traiter cette semaine${
                  atStake ? `, ${formatEuro(atStake)} de revenu mensuel en jeu` : ""
                }.`
              : "Tout est traité cette semaine. Bravo."
          }
          period={period}
          liveLabel="Recalculés à chaque visite"
        />
        <KpiCards
          kpis={[
            {
              id: "pending",
              label: "À traiter",
              value: stats.pending,
              format: "number",
              delta: stats.pending ? "cette semaine" : "tout est traité",
              isGood: stats.pending ? false : true,
              trend: flat(stats.pending),
            },
            {
              id: "stake",
              label: "Argent en jeu",
              value: atStake,
              format: "euro",
              delta: "par mois, sur ce qui reste à traiter",
              isGood: atStake ? false : null,
              trend: flat(atStake),
            },
            {
              id: "done",
              label: "Faits",
              value: stats.done,
              format: "number",
              delta: "cette semaine",
              isGood: stats.done ? true : null,
              trend: flat(stats.done),
            },
            {
              id: "ignored",
              label: "Ignorés",
              value: stats.ignored,
              format: "number",
              delta: "ne reviennent pas cette semaine",
              isGood: null,
              trend: flat(stats.ignored),
            },
          ]}
        />
        <SectionTitle
          title="Cette semaine"
          detail={
            <p className="text-sm text-slate">
              Calculés sur vos vraies données des 30 derniers jours.
            </p>
          }
        />
        <InsightList entries={entries} />
        {alertsSection}
      </>
    );
  }
  const entries = getInsightHistory(context.feedback);
  const stats = summarize(entries);
  const applied = Math.round((stats.done / Math.max(1, stats.done + stats.ignored)) * 100);

  return (
    <>
      <PageHeader
        title="Insights et alertes"
        summary={`Les recommandations que vous avez appliquées rapportent ${formatEuro(stats.measured)} de plus chaque mois.`}
        period={period}
        liveLabel="Nouveaux insights chaque lundi"
      />
      <KpiCards
        kpis={[
          {
            id: "measured",
            label: "Impact mesuré",
            value: stats.measured,
            format: "euro",
            delta: "de revenu mensuel en plus",
            isGood: true,
            trend: [0, 180, 180, 700, 700, 1340, 1340, 1940, stats.measured],
          },
          {
            id: "done",
            label: "Recommandations appliquées",
            value: stats.done,
            format: "number",
            delta: `${applied} % de celles traitées`,
            isGood: true,
            trend: [0, 1, 2, 3, 3, 4, 5, 5, stats.done],
          },
          {
            id: "pending",
            label: "À traiter",
            value: stats.pending,
            format: "number",
            delta: stats.pending ? "cette semaine" : "tout est traité",
            isGood: stats.pending ? false : true,
            trend: [3, 2, 3, 1, 2, 3, 1, 2, stats.pending],
          },
          {
            id: "measuring",
            label: "Mesures en cours",
            value: stats.measuring,
            format: "number",
            delta: "résultat 14 jours après action",
            isGood: null,
            trend: [1, 2, 1, 2, 1, 1, 2, 1, stats.measuring],
          },
        ]}
      />

      <SectionTitle
        title="Tous vos insights"
        detail={<p className="text-sm text-slate">Cliquez sur un insight pour voir son détail.</p>}
      />
      <InsightList entries={entries} />

      {alertsSection}
    </>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Insights et alertes" />}>
      <Insights />
    </Suspense>
  );
}
