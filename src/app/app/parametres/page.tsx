import type { Metadata } from "next";
import { Suspense } from "react";
import { getDashboardContext } from "@/features/dashboard/context";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { BillingPanel } from "@/features/dashboard/settings/billing-panel";
import { IntegrationsPanel } from "@/features/dashboard/settings/integrations-panel";
import { PrivacyPanel } from "@/features/dashboard/settings/privacy-panel";
import { ProjectPanel } from "@/features/dashboard/settings/project-panel";
import { coverageLine } from "@/features/collect/channel-revenue";
import { getCustomerLinks } from "@/features/collect/queries";
import { getRealRevenue } from "@/features/stripe/queries";
import { SettingsTabs } from "@/features/dashboard/settings/settings-tabs";
import { SETTINGS_TABS, type SettingsTab } from "@/features/dashboard/settings/tabs";
import { TeamPanel } from "@/features/dashboard/settings/team-panel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paramètres" };

type Props = { searchParams: Promise<{ onglet?: string; paiement?: string }> };

async function Settings({ searchParams }: Props) {
  const [context, { onglet, paiement }] = await Promise.all([getDashboardContext(), searchParams]);
  const now = new Date();
  // Usage réel : pages vues reçues ce mois-ci (la RLS ne compte que celles de son propre site).
  const supabase = await createClient();
  const { count: pageviewsThisMonth } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("type", "pageview")
    .gte("occurred_at", new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
  const links = context.stripeConnected
    ? await getCustomerLinks(await getRealRevenue("30j", now))
    : null;
  const initial = SETTINGS_TABS.some((tab) => tab.id === onglet)
    ? (onglet as SettingsTab)
    : "projet";

  return (
    <>
      <header className="mb-7">
        <h1 className="mb-2 text-[34px] sm:text-[42px]">Paramètres</h1>
        <p className="text-[17px] text-slate">
          Rien d&apos;obligatoire ici : SaasClair fonctionne déjà. Ajustez seulement ce que vous
          voulez.
        </p>
      </header>
      <SettingsTabs
        initial={initial}
        panels={{
          projet: (
            <ProjectPanel
              project={{
                siteUrl: context.siteUrl,
                siteKey: context.siteKey,
                checkoutUrl: context.checkoutUrl,
                scriptDetected: context.scriptDetected,
                stripeConnected: context.stripeConnected,
                coverage:
                  links && links.paying
                    ? { share: links.coverage, line: coverageLine(links) }
                    : null,
              }}
              demo={context.demo}
            />
          ),
          equipe: <TeamPanel firstName={context.firstName} email={context.email} />,
          abonnement: (
            <BillingPanel
              billing={context.billing}
              access={context.access}
              pageviewsThisMonth={pageviewsThisMonth ?? 0}
              paymentResult={paiement ?? null}
              now={now}
            />
          ),
          confidentialite: (
            <PrivacyPanel siteUrl={context.siteUrl} anonymizeVisitors={context.anonymizeVisitors} />
          ),
          integrations: <IntegrationsPanel />,
        }}
      />
    </>
  );
}

export default function SettingsPage(props: Props) {
  return (
    <Suspense fallback={<ScreenSkeleton label="Paramètres" />}>
      <Settings {...props} />
    </Suspense>
  );
}
