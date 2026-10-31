"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAdminAction, superAdminOrNull } from "./guard";

type Result = { ok: true } | { ok: false; message: string };

const DENIED = "Action réservée au super administrateur.";
const SAVE_ERROR = "La modification n'a pas pu être enregistrée. Réessayez dans un instant.";

/** Désinscrit (ou réinscrit) un abonné : il reste dans l'historique, sans plus rien recevoir. */
export async function setSubscribed(id: string, isSubscribed: boolean): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin || !z.uuid().safeParse(id).success) return { ok: false, message: DENIED };
  const { error } = await admin.supabase
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: isSubscribed ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(
    admin.supabase,
    isSubscribed ? "newsletter.reinscrit" : "newsletter.desinscrit",
    id,
  );
  revalidatePath("/admin/newsletter");
  return { ok: true };
}

/** Efface un abonné (demande de suppression de ses données). */
export async function deleteSubscriber(id: string): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin || !z.uuid().safeParse(id).success) return { ok: false, message: DENIED };
  const { error } = await admin.supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, "newsletter.supprime", id);
  revalidatePath("/admin/newsletter");
  return { ok: true };
}
