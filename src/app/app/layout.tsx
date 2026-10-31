import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Paywall, PastDueBanner } from "@/features/billing/paywall";
import { getDashboardContext } from "@/features/dashboard/context";
import { getPeriod } from "@/features/dashboard/get-period";
import { MobileNav } from "@/features/dashboard/mobile-nav";
import { PeriodContent, PeriodProvider } from "@/features/dashboard/period-context";
import { PeriodSelector } from "@/features/dashboard/period-selector";
import { QuestionBar } from "@/features/dashboard/question-bar";
import { Sidebar } from "@/features/dashboard/sidebar";
import { NotificationsMenu, ProfileMenu } from "@/features/dashboard/topbar-menus";
import { getPublicSettings } from "@/features/site-content/queries";

export const metadata: Metadata = { title: "Tableau de bord", robots: { index: false } };

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const [context, period, settings] = await Promise.all([
    getDashboardContext(),
    getPeriod(),
    getPublicSettings(),
  ]);

  return (
    <PeriodProvider initial={period}>
      <div className="flex min-h-dvh">
        <Sidebar siteUrl={context.siteUrl} />
        <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line/70 bg-cream/90 px-4 backdrop-blur-md sm:gap-3 sm:px-6 lg:px-10">
            <Link
              href="/app"
              aria-label="SaasClair, accueil"
              className="mr-auto rounded-md md:hidden"
            >
              <Logo variant="mark" className="size-9" />
            </Link>
            <QuestionBar demo={context.demo} />
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {context.demo && (
                <Badge className="hidden 2xl:inline-flex">Données de démonstration</Badge>
              )}
              <PeriodSelector />
              <NotificationsMenu demo={context.demo} />
              <ProfileMenu
                firstName={context.firstName}
                email={context.email}
                isSuperAdmin={context.isSuperAdmin}
              />
            </div>
          </header>
          <main
            id="contenu"
            className="@container flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-10 lg:pt-8"
          >
            {context.isSuspended ? (
              <Card className="mx-auto mt-10 max-w-lg">
                <StateMessage
                  tone="error"
                  icon={Lock}
                  anim="wiggle"
                  title="Votre accès est suspendu."
                  description="Vos données sont conservées. Écrivez-nous pour réactiver votre compte : nous répondons sous 24 heures."
                />
              </Card>
            ) : context.access === "expired" ? (
              <Paywall
                trialEnded={context.billing.status === "trialing"}
                hasStripeCustomer={context.billing.hasStripeCustomer}
                contactEmail={settings.contactEmail}
              />
            ) : (
              <>
                {context.access === "past_due" && <PastDueBanner />}
                <PeriodContent>{children}</PeriodContent>
              </>
            )}
          </main>
        </div>
        <MobileNav />
      </div>
    </PeriodProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="hidden w-20 shrink-0 bg-forest md:block lg:w-64" />
      <div className="flex-1 p-6 lg:p-10">
        <Skeleton className="mb-8 h-11 w-full max-w-xl rounded-full" />
        <Skeleton className="mb-3 h-10 w-64" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-40 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
