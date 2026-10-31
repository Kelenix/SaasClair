import type { Metadata } from "next";
import { Suspense } from "react";
import { Filter } from "lucide-react";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { getTunnelData, stepRates } from "@/features/dashboard/tunnel/data";
import {
  FunnelChart,
  SegmentComparison,
  WeakestStepCard,
} from "@/features/dashboard/tunnel/tunnel-views";

export const metadata: Metadata = { title: "Tunnel de conversion" };

async function Tunnel() {
  const [context, period] = await Promise.all([getDashboardContext(), getPeriod()]);
  if (!context.demo) {
    return (
      <NoData
        title="Tunnel de conversion"
        icon={Filter}
        needs="script"
        remaining={context.setupRemaining}
        description="Votre tunnel (visite, inscription, activation, essai, paiement) se dessinera ici dès que le script sera installé sur votre site."
        waiting="Le script est installé. Votre tunnel se dessinera ici dès les premières visites."
      />
    );
  }
  const data = getTunnelData(period);

  return (
    <>
      <PageHeader
        title="Tunnel de conversion"
        summary={data.summary}
        period={period}
        liveLabel="Parcours suivis en direct"
      />
      <KpiCards kpis={data.kpis} />

      <SectionTitle title="Où vos visiteurs s'arrêtent" />
      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[1.5fr_1fr]">
        <FunnelChart funnel={data.funnel} weakest={data.weakest} />
        {data.weakest > 0 && (
          <WeakestStepCard
            step={data.funnel[data.weakest]}
            previous={data.funnel[data.weakest - 1]}
            cause={data.cause}
          />
        )}
      </div>

      <SectionTitle
        title="Par appareil, pays et canal"
        detail={<p className="text-sm text-slate">En or : l&apos;écart le plus important.</p>}
      />
      <SegmentComparison comparisons={data.comparisons} overall={stepRates(data.funnel)} />
    </>
  );
}

export default function TunnelPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Tunnel de conversion" />}>
      <Tunnel />
    </Suspense>
  );
}
