import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeading } from "@/features/auth/auth-heading";
import { SignUpForm } from "@/features/auth/forms";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Essai gratuit de 7 jours. Deux actions, et vous savez qui va partir.",
  alternates: { canonical: "/inscription" },
};

export default function SignUpPage() {
  return (
    <>
      <AuthHeading
        title="Créez votre compte."
        subtitle="7 jours gratuits. Deux actions, et votre tableau de bord est prêt."
      />
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignUpForm />
      </Suspense>
    </>
  );
}
