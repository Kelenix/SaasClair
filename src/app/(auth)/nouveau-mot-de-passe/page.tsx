import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/auth-heading";
import { NewPasswordForm } from "@/features/auth/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Choisissez un nouveau mot de passe."
        subtitle="Ensuite, on vous ramène à vos chiffres."
      />
      <NewPasswordForm />
    </>
  );
}
