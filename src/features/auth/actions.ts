"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ATTRIBUTION_COOKIE,
  attributionMetadata,
  parseAttribution,
} from "@/features/attribution/attribution";
import { safeRedirectPath, setupPath, withWelcome } from "@/lib/safe-redirect";
import { SITE_URL } from "@/lib/site";
import { normalizeSiteUrl } from "@/lib/site-url";
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

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    firstName: read(formData, "firstName"),
    email: read(formData, "email"),
    password: read(formData, "password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const site = normalizeSiteUrl(read(formData, "site"));
  const next = setupPath(site);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // La provenance notée au premier passage suit le compte (reprise par le profil).
      data: {
        first_name: parsed.data.firstName,
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error.code) };
  const next = read(formData, "next");
  // Sans page demandée, le super administrateur arrive dans son espace, pas dans la configuration.
  if (!next) {
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
    if (isSuperAdmin) redirect("/admin");
  }
  redirect(safeRedirectPath(next));
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: read(formData, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
