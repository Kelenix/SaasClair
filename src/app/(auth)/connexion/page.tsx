import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeading } from "@/features/auth/auth-heading";
import { SignInForm } from "@/features/auth/forms";

export const metadata: Metadata = {
  title: "Connexion",
  alternates: { canonical: "/connexion" },
};

export default function SignInPage() {
  return (
    <>
      <AuthHeading title="Bon retour." subtitle="Vos chiffres vous attendent." />
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignInForm />
      </Suspense>
    </>
  );
}
