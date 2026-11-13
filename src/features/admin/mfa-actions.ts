"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient, getUser } from "@/lib/supabase/server";

// Double authentification du super administrateur (audit, lot A7) : une application
// d'authentification (Google Authenticator, 1Password, Authy…) donne un code à 6 chiffres. Sans
// lui, la base refuse tout accès d'administration (is_super_admin exige le niveau aal2).

export type MfaState = { message?: string };
export type Enrollment = { factorId: string; qrCode: string; secret: string } | { error: string };

/** 5 codes essayés par compte et par 5 minutes : un code à 6 chiffres ne se devine pas. */
const attempts = createRateLimiter({ limit: 5, windowMs: 5 * 60_000 });
const codeSchema = z.object({
  factorId: z.string().uuid(),
  code: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Le code fait 6 chiffres.")),
});

/** Le compte connecté, s'il est super administrateur (rôle lu dans son propre profil). */
async function superAdminAccount() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "super_admin" ? { user, supabase } : null;
}

/**
 * Prépare l'ajout de l'application : un nouveau secret et son QR code. Une tentative précédente
 * non terminée est d'abord retirée (QR code affiché puis page quittée, par exemple).
 */
export async function startEnrollment(): Promise<Enrollment> {
  const account = await superAdminAccount();
  if (!account) return { error: "Réservé au super administrateur." };
  const { supabase } = account;

  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Un seul appareil à la fois : une application déjà confirmée se change par le script de
  // réinitialisation (deploy/scripts/reset-admin-2fa.sh), jamais depuis une session simple.
  if (factors?.totp.length) return { error: "Une application est déjà reliée à ce compte." };
  for (const factor of factors?.all ?? []) {
    if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "SaasClair",
    friendlyName: `SaasClair ${new Date().toISOString().slice(0, 16)}`,
  });
  if (error || !data) {
    console.error("Double authentification (ajout) :", error?.message);
    return { error: "L'ajout n'a pas pu démarrer. Réessayez dans un instant." };
  }
  const qr = data.totp.qr_code;
  return {
    factorId: data.id,
    qrCode: qr.startsWith("data:") ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`,
    secret: data.totp.secret,
  };
}

/** Vérifie le code à 6 chiffres : la session passe au niveau aal2, puis l'administration s'ouvre. */
export async function confirmCode(_: MfaState, formData: FormData): Promise<MfaState> {
  const account = await superAdminAccount();
  if (!account) return { message: "Réservé au super administrateur." };
  const parsed = codeSchema.safeParse({
    factorId: formData.get("factorId"),
    code: String(formData.get("code") ?? ""),
  });
  if (!parsed.success) return { message: "Entrez les 6 chiffres affichés par l'application." };
  if (!attempts.take(account.user.id)) {
    return { message: "Trop d'essais. Attendez 5 minutes, puis entrez le nouveau code." };
  }

  const { error } = await account.supabase.auth.mfa.challengeAndVerify(parsed.data);
  if (error) {
    return {
      message:
        "Ce code ne correspond pas. Entrez le code affiché en ce moment (il change toutes les 30 secondes) et vérifiez l'heure de votre téléphone.",
    };
  }
  attempts.reset(account.user.id);
  redirect("/admin");
}
