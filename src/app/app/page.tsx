import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { getDashboardContext } from "@/features/dashboard/context";
import { getHomeData } from "@/features/dashboard/demo-data";
import { getPeriod } from "@/features/dashboard/get-period";
import { CheckoutBanner, SetupBanner } from "@/features/dashboard/home/banners";
import { HomeSkeleton } from "@/features/dashboard/home/home-skeleton";
import { InsightCards } from "@/features/dashboard/home/insight-cards";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { AtRiskCard, ChannelsCard, FunnelPreview } from "@/features/dashboard/home/overview-cards";
import { RevenueChart } from "@/features/dashboard/home/revenue-chart";
import { NoData } from "@/features/dashboard/no-data";
import { PageHeader, SectionTitle } from "@/features/dashboard/page-header";

async function Home() {
  const [context, period] = await Promise.all([getDashboardContext(), getPeriod()]);

  // Production : uniquement les données réelles, donc rien tant qu'elles n'existent pas.
  if (!context.demo) {
    return (
      <>
        {!context.isSetupComplete && (
          <SetupBanner remaining={context.setupRemaining} demo={context.demo} />
        )}
        <NoData
          title={`Bonjour${context.firstName ? ` ${context.firstName}` : ""}.`}
          icon={LayoutDashboard}
          needs="site"
          remaining={[]}
          description=""
          waiting={
            context.isSetupComplete
              ? "Tout est prêt de votre côté. Votre revenu, votre churn et votre conversion apparaîtront ici dès les premières visites et les premiers paiements reçus."
              : "Votre revenu, votre churn et votre conversion apparaîtront ici dès que la configuration sera terminée."
          }
        />
      </>
    );
  }

  const data = getHomeData(period);

  return (
    <>
      {!context.isSetupComplete && (
        <SetupBanner remaining={context.setupRemaining} demo={context.demo} />
      )}
      {context.isSetupComplete && context.siteUrl && !context.checkoutUrl && (
        <CheckoutBanner siteUrl={context.siteUrl} />
      )}

      <PageHeader
        title={<>Bonjour{context.firstName && ` ${context.firstName}`}.</>}
        summary={data.summary}
        period={period}
        liveLabel="Santé de votre SaaS"
      />

      <KpiCards kpis={data.kpis} />

      <SectionTitle
        title="Les 3 insights de la semaine"
        detail={<p className="text-sm text-slate">Chaque recommandation cite ses chiffres.</p>}
      />
      <InsightCards insights={data.insights} feedback={context.feedback} />

      <SectionTitle title="Revenus et acquisition" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[1.6fr_1fr]">
        <RevenueChart buckets={data.revenue} />
        <ChannelsCard channels={data.channels} />
      </div>

      <SectionTitle title="Tunnel et clients à risque" />
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <FunnelPreview funnel={data.funnel} />
        <AtRiskCard customers={data.atRisk} />
      </div>
    </>
  );
}

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}
