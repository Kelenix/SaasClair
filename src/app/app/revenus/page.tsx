import type { Metadata } from "next";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { getRevenueData } from "@/features/dashboard/revenue/data";
import { FailedPayments, MrrChart, RevenueFlows } from "@/features/dashboard/revenue/revenue-views";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "Revenus" };

async function Revenue() {
  const [context, period] = await Promise.all([getDashboardContext(), getPeriod()]);
  if (!context.demo) {
    return (
      <NoData
        title="Revenus"
        icon={Wallet}
        needs="stripe"
        remaining={context.setupRemaining}
        description="Votre revenu mensuel récurrent, ses mouvements et les paiements échoués apparaîtront ici dès que Stripe sera connecté."
        waiting="Stripe est connecté. Vos revenus apparaîtront ici dès vos premiers paiements."
      />
    );
  }
  const data = getRevenueData(period);

  return (
    <>
      <PageHeader
        title="Revenus"
        summary={data.summary}
        period={period}
        liveLabel="Synchronisé avec Stripe"
      />
      <KpiCards kpis={data.kpis} />

      <SectionTitle title="Évolution et mouvements" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[1.5fr_1fr]">
        <MrrChart startMrr={data.startMrr} history={data.history} />
        <RevenueFlows flows={data.flows} startMrr={data.startMrr} />
      </div>

      <SectionTitle
        title="Argent à récupérer"
        detail={
          <p className="text-sm text-slate">Nous relançons les cartes refusées automatiquement.</p>
        }
      />
      <FailedPayments payments={data.failedPayments} recovered={data.recoveredAutomatically} />
    </>
  );
}

export default function RevenuePage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Revenus" />}>
      <Revenue />
    </Suspense>
  );
}
