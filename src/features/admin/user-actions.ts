"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eraseAccount } from "@/features/account/erase";
import { logAdminAction, superAdminOrNull } from "./guard";

type Result = { ok: true } | { ok: false; message: string };

const DENIED = "Action réservée au super administrateur.";
const SAVE_ERROR = "La modification n'a pas pu être enregistrée. Réessayez dans un instant.";

const subscriptionSchema = z.object({
  userId: z.uuid(),
  plan: z.enum(["trial", "starter", "growth", "pro"]),
  billingInterval: z.enum(["monthly", "annual"]).nullable(),
  paymentMethod: z.enum(["card", "sepa", "paypal", "bank_transfer"]).nullable(),
  status: z.enum(["trialing", "active", "past_due", "canceled", "suspended"]),
  adminNote: z.string().trim().max(1000),
});

/** Offre, rythme, moyen de paiement et statut d'un client (gestion manuelle de l'abonnement). */
export async function updateSubscription(input: unknown): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Vérifiez les champs saisis." };
  const data = parsed.data;
  const isTrial = data.plan === "trial";

  const { error } = await admin.supabase
    .from("profiles")
    .update({
      plan: data.plan,
      billing_interval: isTrial ? null : data.billingInterval,
      payment_method: isTrial ? null : data.paymentMethod,
      subscription_status: data.status,
      custom_monthly_price: null,
      admin_note: data.adminNote || null,
    })
    .eq("id", data.userId);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, "abonnement.modifie", data.userId, {
    plan: data.plan,
    statut: data.status,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Prolonge l'essai gratuit (7 ou 14 jours) à partir d'aujourd'hui ou de la fin prévue. */
export async function extendTrial(userId: string, days: 7 | 14): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  if (!z.uuid().safeParse(userId).success || ![7, 14].includes(days)) {
    return { ok: false, message: SAVE_ERROR };
  }
  const { data: profile } = await admin.supabase
    .from("profiles")
    .select("trial_ends_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return { ok: false, message: "Utilisateur introuvable." };
  const from = Math.max(Date.parse(profile.trial_ends_at), Date.now());
  const { error } = await admin.supabase
    .from("profiles")
    .update({
      trial_ends_at: new Date(from + days * 86_400_000).toISOString(),
      plan: "trial",
      subscription_status: "trialing",
    })
    .eq("id", userId);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, "essai.prolonge", userId, { jours: days });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Donne ou retire le rôle de super administrateur (jamais à soi-même). */
export async function setSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  if (userId === admin.user.id) {
    return { ok: false, message: "Vous ne pouvez pas modifier votre propre rôle." };
  }
  const { error } = await admin.supabase
    .from("profiles")
    .update({ role: isSuperAdmin ? "super_admin" : "user" })
    .eq("id", userId);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, isSuperAdmin ? "role.donne" : "role.retire", userId);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Supprime définitivement un compte et toutes ses données (projet, réglages, suivi).
 * Passe par la clé de service, uniquement ici, côté serveur, après vérification du rôle et de
 * l'email retapé.
 */
export async function deleteUser(userId: string, emailConfirmation: string): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  if (userId === admin.user.id) {
    return { ok: false, message: "Vous ne pouvez pas supprimer votre propre compte ici." };
  }
  const { data: profile } = await admin.supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return { ok: false, message: "Utilisateur introuvable." };
  if (profile.email.toLowerCase() !== emailConfirmation.trim().toLowerCase()) {
    return { ok: false, message: "L'email saisi ne correspond pas à ce compte." };
  }
  // Accès Stripe coupé et abonnement SaasClair arrêté d'abord, puis effacement (account/erase.ts).
  const erased = await eraseAccount(userId);
  if (!erased.ok) return erased;
  await logAdminAction(admin.supabase, "compte.supprime", profile.email);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
