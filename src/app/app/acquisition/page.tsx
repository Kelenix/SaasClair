import type { Metadata } from "next";
import { Suspense } from "react";
import { Route } from "lucide-react";
import {
  ChannelEvolution,
  ChannelShare,
  ChannelTable,
  SourceTabs,
} from "@/features/dashboard/acquisition/channel-views";
import { getRealAcquisition } from "@/features/collect/queries";
import { RealAcquisitionView } from "@/features/collect/real-acquisition";
import { COVERAGE, getAcquisitionData } from "@/features/dashboard/acquisition/data";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { formatNumber, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Acquisition" };

async function Acquisition() {
  const [context, period] = await Promise.all([getDashboardContext(), getPeriod()]);

  // Les vraies visites d'abord ; l'exemple seulement en local ; sinon l'écran vide.
  const real = await getRealAcquisition(period, new Date());
  if (real.visitors > 0) {
    const first = real.channels[0];
    return (
      <>
        <PageHeader
          title="Acquisition"
          summary={`${formatNumber(real.visitors)} visiteur${real.visitors > 1 ? "s" : ""} sur la période${first ? `, ${first.name} en tête (${formatPercent(first.share)}).` : "."}`}
          period={period}
          liveLabel="Visites suivies en direct"
        />
        <RealAcquisitionView data={real} />
      </>
    );
  }
  if (!context.demo) {
    return (
      <NoData
        title="Acquisition"
        icon={Route}
        needs="script"
        remaining={context.setupRemaining}
        description="Vos canaux d'acquisition, classés par revenu, apparaîtront ici dès que le script sera installé sur votre site."
        waiting="Le script est installé. Vos canaux d'acquisition apparaîtront ici dès les premières visites."
      />
    );
  }
  const data = getAcquisitionData(period);

  return (
    <>
      <PageHeader
        title="Acquisition"
        summary={data.summary}
        period={period}
        liveLabel="Visites suivies en direct"
      />
      <KpiCards kpis={data.kpis} />

      <SectionTitle
        title="Ce que rapporte chaque canal"
        detail={
          <p className="text-sm text-slate">
            {COVERAGE} % de vos clients sont reliés à leur provenance.
          </p>
        }
      />
      <ChannelTable channels={data.channels} />

      <SectionTitle title="Répartition et évolution" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[1fr_1.6fr]">
        <ChannelShare channels={data.channels} />
        <ChannelEvolution slots={data.evolution} channels={data.channels} />
      </div>

      <SectionTitle title="Campagnes et pages d'entrée" />
      <SourceTabs campaigns={data.campaigns} landingPages={data.landingPages} />
    </>
  );
}

export default function AcquisitionPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Acquisition" />}>
      <Acquisition />
    </Suspense>
  );
}
