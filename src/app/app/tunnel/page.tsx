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

import { pathOf } from "@/features/collect/funnel";
import { getRealFunnel } from "@/features/collect/queries";
import { funnelSummary, RealTunnel } from "@/features/collect/real-funnel";
import { KeyPageBanner } from "@/features/dashboard/home/banners";

export const metadata: Metadata = { title: "Tunnel de conversion" };

async function Tunnel() {
  const [context, period] = await Promise.all([getDashboardContext(), getPeriod()]);
  if (!context.demo) {
    const paths = {
      pricing: pathOf(context.pricingUrl, context.siteUrl),
      signup: pathOf(context.signupUrl, context.siteUrl),
    };
    const funnel = context.scriptDetected
      ? await getRealFunnel(period, new Date(), paths, { stripe: context.stripeConnected })
      : null;
    if (!funnel) {
      return (
        <NoData
          title="Tunnel de conversion"
          preview="funnel"
          icon={Filter}
          needs="script"
          remaining={context.setupRemaining}
          description="Votre tunnel (visite, tarifs, inscription, puis essai et paiement avec Stripe) se dessinera ici dès que la ligne SaasClair sera installée sur votre site."
          waiting="Aucune visite sur cette période : choisissez une période plus longue, ou attendez vos prochains visiteurs."
        />
      );
    }
    // Page clé introuvable : question en un clic, avec la page la plus probable d'après les visites.
    const missing = (["signup", "pricing"] as const).filter((kind) => !paths[kind]);
    return (
      <>
        {context.siteUrl &&
          missing.map((kind) => (
            <KeyPageBanner
              key={kind}
              kind={kind}
              siteUrl={context.siteUrl!}
              guess={funnel.guesses[kind]}
            />
          ))}
        <PageHeader
          title="Tunnel de conversion"
          summary={funnelSummary(funnel)}
          period={period}
          liveLabel="Calculé sur vos visites"
        />
        <RealTunnel funnel={funnel} />
      </>
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
