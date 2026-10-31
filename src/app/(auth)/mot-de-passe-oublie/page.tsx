import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/auth-heading";
import { ResetRequestForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Mot de passe oublié ?"
        subtitle="Indiquez votre email : vous recevez un lien pour en choisir un nouveau."
      />
      <ResetRequestForm />
    </>
  );
}
