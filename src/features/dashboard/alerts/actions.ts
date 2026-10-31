"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { alertPreferencesSchema, slackWebhookSchema } from "./catalog";

type Result = { ok: true } | { ok: false; message: string };

const SAVE_ERROR = "Ce réglage n'a pas pu être enregistré. Réessayez dans un instant.";

/** Alertes coupées et envoi par email. */
export async function saveAlertPreferences(input: unknown): Promise<Result> {
  const user = await getUser();
  const parsed = alertPreferencesSchema.safeParse(input);
  if (!user || !parsed.success) return { ok: false, message: SAVE_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.from("alert_settings").upsert({
    owner_id: user.id,
    disabled_alerts: parsed.data.disabledAlerts,
    email_enabled: parsed.data.emailEnabled,
  });
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app/insights");
  return { ok: true };
}

/** Connecte Slack (webhook entrant) ou le retire (null). L'adresse n'est jamais renvoyée au navigateur. */
export async function saveSlackWebhook(input: string | null): Promise<Result> {
  const user = await getUser();
  if (!user) return { ok: false, message: SAVE_ERROR };
  const parsed = input === null ? null : slackWebhookSchema.safeParse(input);
  if (parsed && !parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? SAVE_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("alert_settings")
    .upsert({ owner_id: user.id, slack_webhook_url: parsed ? parsed.data : null });
  if (error) return { ok: false, message: SAVE_ERROR };
  revalidatePath("/app/insights");
  return { ok: true };
}
