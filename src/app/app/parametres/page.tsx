import type { Metadata } from "next";
import { Suspense } from "react";
import { getDashboardContext } from "@/features/dashboard/context";
import { DAY_MS } from "@/features/dashboard/demo-utils";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { BillingPanel } from "@/features/dashboard/settings/billing-panel";
import { IntegrationsPanel } from "@/features/dashboard/settings/integrations-panel";
import { PrivacyPanel } from "@/features/dashboard/settings/privacy-panel";
import { ProjectPanel } from "@/features/dashboard/settings/project-panel";
import { SettingsTabs } from "@/features/dashboard/settings/settings-tabs";
import { SETTINGS_TABS, type SettingsTab } from "@/features/dashboard/settings/tabs";
import { TeamPanel } from "@/features/dashboard/settings/team-panel";

export const metadata: Metadata = { title: "Paramètres" };

const TRIAL_DAYS = 14;

type Props = { searchParams: Promise<{ onglet?: string }> };

async function Settings({ searchParams }: Props) {
  const [context, { onglet }] = await Promise.all([getDashboardContext(), searchParams]);
  const initial = SETTINGS_TABS.some((tab) => tab.id === onglet)
    ? (onglet as SettingsTab)
    : "projet";
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(context.accountCreatedAt).getTime()) / DAY_MS,
  );

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
              }}
            />
          ),
          equipe: <TeamPanel firstName={context.firstName} email={context.email} />,
          abonnement: (
            <BillingPanel trialDaysLeft={Math.max(0, TRIAL_DAYS - daysSinceSignup)} members={1} />
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
