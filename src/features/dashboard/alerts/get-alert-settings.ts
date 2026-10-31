import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ALERT_IDS, DEFAULT_ALERT_SETTINGS, type AlertId, type AlertSettings } from "./catalog";

/** Réglages d'alertes du compte ; sans ligne en base, tout est actif et arrive par email. */
export async function getAlertSettings(): Promise<AlertSettings> {
  // Lu en parallèle de la session : rendu à la requête, avant que le client Supabase lise l'heure.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("alert_settings")
    .select("disabled_alerts, email_enabled, slack_webhook_url")
    .maybeSingle();
  if (!data) return DEFAULT_ALERT_SETTINGS;
  return {
    disabledAlerts: data.disabled_alerts.filter((id): id is AlertId =>
      (ALERT_IDS as string[]).includes(id),
    ),
    emailEnabled: data.email_enabled,
    slackConnected: data.slack_webhook_url !== null,
  };
}
