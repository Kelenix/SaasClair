import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/features/auth/actions";
import { TrackingLoader } from "@/features/site-content/tracking-loader";
import { FinishLater } from "@/features/setup/finish-later";
import { SetupFlow } from "@/features/setup/setup-flow";
import type { SiteAudit } from "@/features/setup/site-analysis";
import { completedSteps, isActionStep, stepOf, type SetupState } from "@/features/setup/steps";
import { isDemoMode } from "@/lib/demo-mode";
import { normalizeSiteUrl } from "@/lib/site-url";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Configuration", robots: { index: false } };

type SearchParams = Promise<{ site?: string; bienvenue?: string; etape?: string }>;

/**
 * Reprend la configuration là où elle s'était arrêtée (le projet est enregistré à chaque étape),
 * ou à l'étape demandée par le bandeau du tableau de bord (`?etape=script`).
 */
async function SetupLoader({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/configuration");

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  const params = await searchParams;
  const siteFromLanding = normalizeSiteUrl(params.site ?? "");
  const step = stepOf(project);
  const requested = isActionStep(params.etape) ? params.etape : null;
  // Configuration terminée, ou remise à plus tard (connexion suivante) : direction le tableau de
  // bord, qui rappelle ce qui reste. L'écran final, lui, s'affiche dans le parcours.
  if (step === "done" || (!requested && project?.setup_skipped_at)) redirect("/app");

  const initial: SetupState = {
    firstName: (user.user_metadata.first_name as string | undefined) ?? "",
    siteUrl: project?.site_url ?? siteFromLanding ?? "",
    audit: (project?.audit as SiteAudit | null) ?? null,
    siteKey: project?.id.slice(0, 8) ?? null,
    step: requested ?? step,
    completed: completedSteps(project),
    demo: isDemoMode(),
  };
  return (
    <>
      <SetupFlow initial={initial} />
      {/* Inscription réussie : conversion publicitaire (seulement après consentement). */}
      {params.bienvenue === "1" && <TrackingLoader conversion />}
    </>
  );
}

function SetupSkeleton() {
  return (
    <div
      className="flex w-full flex-col items-center gap-10"
      aria-busy="true"
      aria-label="Chargement de la configuration"
    >
      <Skeleton className="h-2 w-full max-w-2xl rounded-full" />
      <div className="w-full max-w-2xl rounded-card border border-line bg-white p-10 shadow-card">
        <Skeleton className="mb-4 h-3 w-28" />
        <Skeleton className="mb-3 h-10 w-3/4" />
        <Skeleton className="mb-8 h-4 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export default function SetupPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="SaasClair, accueil" className="rounded-md">
          <Logo className="h-6 sm:h-7" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <FinishLater />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" aria-label="Se déconnecter">
              <Icon icon={LogOut} anim="nudge" className="sm:hidden" />
              <span className="hidden sm:inline">Se déconnecter</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 sm:px-8 sm:pt-8">
        <Suspense fallback={<SetupSkeleton />}>
          <SetupLoader searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
