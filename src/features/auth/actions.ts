"use server";

import { PAID_PLANS } from "@/features/billing/plans";
import { firstNameFromEmail } from "./first-name";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ATTRIBUTION_COOKIE,
  attributionMetadata,
  parseAttribution,
} from "@/features/attribution/attribution";
import { safeRedirectPath, setupPath, withWelcome } from "@/lib/safe-redirect";
import { SITE_URL } from "@/lib/site";
import { normalizeSiteUrl } from "@/lib/site-url";
import { createRateLimiter } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import {
  fieldErrorsOf,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type FieldErrors,
} from "./schemas";

export type AuthState = {
  fieldErrors?: FieldErrors;
  message?: string;
  /** « check-email » : un email a été envoyé, le formulaire laisse place à une confirmation. */
  status?: "error" | "check-email";
  email?: string;
};

const read = (formData: FormData, key: string) => String(formData.get(key) ?? "");

// Limites contre la force brute et l'envoi d'emails en série (audit de sécurité, A5). Les
// appels partent du serveur de SaasClair : Supabase ne voit donc pas l'adresse du visiteur, et
// c'est ici qu'on la freine (adresse transmise par Nginx, jamais enregistrée).
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const failedByEmail = createRateLimiter({ limit: 8, windowMs: FIFTEEN_MINUTES });
const failedByIp = createRateLimiter({ limit: 30, windowMs: FIFTEEN_MINUTES });
const emailsByIp = createRateLimiter({ limit: 10, windowMs: FIFTEEN_MINUTES });
const TOO_MANY_ATTEMPTS =
  "Trop de tentatives. Patientez 15 minutes, ou recevez un lien de connexion par email.";
const TOO_MANY_EMAILS = "Trop de demandes en peu de temps. Réessayez dans 15 minutes.";

async function clientIp() {
  const list = await headers();
  return list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

/** Inscription, mot de passe oublié, lien magique : chaque envoi d'email compte. */
async function emailAllowed() {
  const ip = await clientIp();
  return !ip || emailsByIp.take(ip);
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    firstName: read(formData, "firstName"),
    email: read(formData, "email"),
    password: read(formData, "password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await emailAllowed())) return { status: "error", message: TOO_MANY_EMAILS };
  const site = normalizeSiteUrl(read(formData, "site"));
  // Offre choisie sur la page Tarifs : présélectionnée au moment de payer.
  const offer = read(formData, "offre");
  const planIntent = (PAID_PLANS as readonly string[]).includes(offer) ? offer : null;
  const next = setupPath(site);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // La provenance notée au premier passage suit le compte (reprise par le profil).
      data: {
        first_name: parsed.data.firstName || firstNameFromEmail(parsed.data.email),
        ...(planIntent ? { plan_intent: planIntent } : {}),
        ...attributionMetadata(parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value)),
      },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { status: "error", message: authErrorMessage(error.code) };
  // Confirmation d'email activée (production) : pas encore de session.
  if (!data.session) return { status: "check-email", email: parsed.data.email };
  redirect(withWelcome(next));
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: read(formData, "email"),
    password: read(formData, "password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  if (!failedByEmail.allows(email) || (ip && !failedByIp.allows(ip))) {
    return { status: "error", message: TOO_MANY_ATTEMPTS };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Seuls les échecs comptent : une connexion réussie remet le compteur de l'email à zéro.
    failedByEmail.hit(email);
    if (ip) failedByIp.hit(ip);
    return { status: "error", message: authErrorMessage(error.code) };
  }
  failedByEmail.reset(email);
  const next = read(formData, "next");
  // Sans page demandée, le super administrateur arrive dans son espace (après le code de sa
  // double authentification), pas dans la configuration. Rôle lu dans son propre profil : la
  // session n'est pas encore confirmée, is_super_admin dirait non.
  if (!next) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.role === "super_admin") redirect("/admin");
  }
  redirect(safeRedirectPath(next));
}

/**
 * Connexion sans mot de passe : un lien à usage unique, envoyé par email (Resend). Seulement pour
 * un compte existant ; même réponse sinon (on ne révèle pas qui a un compte).
 */
export async function requestMagicLink(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: read(formData, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await emailAllowed())) return { status: "error", message: TOO_MANY_EMAILS };
  const next = safeRedirectPath(read(formData, "next"), "/app");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  // Compte inconnu : même écran que si le lien était parti.
  const unknown = ["otp_disabled", "user_not_found", "signup_disabled"];
  if (error && !unknown.includes(error.code ?? "")) {
    return { status: "error", message: authErrorMessage(error.code) };
  }
  return { status: "check-email", email: parsed.data.email };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: read(formData, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  if (!(await emailAllowed())) return { status: "error", message: TOO_MANY_EMAILS };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/nouveau-mot-de-passe`,
  });
  // Même réponse que l'adresse existe ou non : on ne révèle pas qui a un compte.
  if (error && error.code !== "user_not_found") {
    return { status: "error", message: authErrorMessage(error.code) };
  }
  return { status: "check-email", email: parsed.data.email };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({ password: read(formData, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error.code) };
  redirect("/configuration");
}

/** Déconnexion : retour à la page d'accueil du site. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
