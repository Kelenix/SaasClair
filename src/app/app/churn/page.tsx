import type { Metadata } from "next";
import { Suspense } from "react";
import { HeartPulse } from "lucide-react";
import { CohortHeatmap } from "@/features/dashboard/churn/cohort-heatmap";
import { getChurnData } from "@/features/dashboard/churn/data";
import { DepartureReasons } from "@/features/dashboard/churn/departure-reasons";
import { Watchlist } from "@/features/dashboard/churn/watchlist";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "Churn et rétention" };

type Props = { searchParams: Promise<{ client?: string }> };

async function Churn({ searchParams }: Props) {
  const [context, period, { client }] = await Promise.all([
    getDashboardContext(),
    getPeriod(),
    searchParams,
  ]);
  if (!context.demo) {
    return (
      <NoData
        title="Churn et rétention"
        icon={HeartPulse}
        needs="stripe"
        remaining={context.setupRemaining}
        description="Vos clients à risque, votre churn et vos cohortes apparaîtront ici dès que Stripe sera connecté."
        waiting="Stripe est connecté. Vos clients à risque apparaîtront ici dès vos premiers abonnements."
      />
    );
  }
  const data = getChurnData(period);

  return (
    <>
      <PageHeader
        title="Churn et rétention"
        summary={data.summary}
        period={period}
        liveLabel="Risque recalculé chaque nuit"
      />
      <KpiCards kpis={data.kpis} />

      <SectionTitle
        title="Qui risque de partir"
        detail={<p className="text-sm text-slate">Cliquez sur un client pour voir son détail.</p>}
      />
      <Watchlist customers={data.watchlist} sender={context.firstName} initialOpenId={client} />

      <SectionTitle title="Rétention et raisons de départ" />
      <div className="grid grid-cols-1 gap-4 @6xl:grid-cols-[1.5fr_1fr]">
        <CohortHeatmap cohorts={data.cohorts} />
        <DepartureReasons reasons={data.reasons} />
      </div>
    </>
  );
}

export default function ChurnPage(props: Props) {
  return (
    <Suspense fallback={<ScreenSkeleton label="Churn et rétention" />}>
      <Churn {...props} />
    </Suspense>
  );
}
