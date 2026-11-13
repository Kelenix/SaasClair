import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { MfaChallenge, MfaEnroll } from "@/features/admin/mfa-form";
import { createClient, getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Double authentification",
  robots: { index: false },
};

/**
 * Porte de l'administration (audit, lot A7) : le super administrateur confirme chaque session
 * avec le code de son application d'authentification ; au premier passage, il la relie.
 */
async function Gate() {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/admin");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") redirect("/app");

  const [{ data: level }, { data: factors }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (level?.currentLevel === "aal2") redirect("/admin");
  const factor = factors?.totp[0];

  return (
    <>
      <h1 className="mb-2 font-serif text-3xl font-semibold text-forest">
        {factor ? "Entrez votre code." : "Protégez l'administration."}
      </h1>
      <p className="mb-8 text-slate">
        {factor
          ? "Un code à 6 chiffres confirme que c'est bien vous, même si votre mot de passe a fuité."
          : "Une seule fois : reliez une application d'authentification. Ensuite, un code à 6 chiffres vous sera demandé à chaque connexion à l'administration."}
      </p>
      {factor ? <MfaChallenge factorId={factor.id} /> : <MfaEnroll />}
      <p className="mt-6 text-center text-sm text-slate">
        Pas maintenant ?{" "}
        <Link href="/app" className="font-semibold text-forest underline-offset-4 hover:underline">
          Aller à mon tableau de bord
        </Link>
      </p>
    </>
  );
}

export default function TwoFactorPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream px-5 py-6 sm:px-12 sm:py-8">
      <Link href="/" aria-label="SaasClair, retour à l'accueil" className="self-start rounded-md">
        <Logo priority className="h-7" />
      </Link>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Chargement">
              <Skeleton className="mb-3 h-10 w-64" />
              <Skeleton className="mb-8 h-4 w-80 max-w-full" />
              <Skeleton className="h-56 rounded-card" />
            </div>
          }
        >
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}
