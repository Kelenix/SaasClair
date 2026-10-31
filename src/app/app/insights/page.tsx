import type { Metadata } from "next";
import { Suspense } from "react";
import { Lightbulb } from "lucide-react";
import { AlertSettingsPanel } from "@/features/dashboard/alerts/alert-settings";
import { getAlertSettings } from "@/features/dashboard/alerts/get-alert-settings";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { getInsightHistory, summarize } from "@/features/dashboard/insights/history";
import { InsightList } from "@/features/dashboard/insights/insight-list";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { formatEuro } from "@/lib/format";

export const metadata: Metadata = { title: "Insights et alertes" };

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
    return (
      <>
        <NoData
          title="Insights et alertes"
          icon={Lightbulb}
          needs="script"
          remaining={context.setupRemaining}
          description="Chaque lundi, vos insights (constat, cause probable, action et impact en euros) apparaîtront ici. Il faut d'abord vos premières données."
          waiting="Vos premiers insights arriveront le lundi qui suit vos premières données."
        />
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
