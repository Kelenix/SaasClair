import { z } from "zod";

// Alertes proposées : toutes actives par défaut, l'utilisateur peut en couper certaines.
export const ALERTS = [
  {
    id: "churn-risk",
    label: "Client à risque de départ",
    detail: "Dès qu'un client passe en risque élevé, avec l'action conseillée.",
  },
  {
    id: "failed-payment",
    label: "Paiement échoué",
    detail: "Avec la relance prête à envoyer.",
  },
  {
    id: "conversion-drop",
    label: "Baisse de conversion",
    detail: "Quand une étape du tunnel recule de plus de 15 % sur 7 jours.",
  },
  {
    id: "traffic-drop",
    label: "Chute des visites",
    detail: "Quand les visites baissent de plus de 30 % en une journée.",
  },
  {
    id: "script-silent",
    label: "Script silencieux",
    detail: "Si nous ne recevons plus aucune visite pendant 6 heures.",
  },
  {
    id: "weekly-digest",
    label: "Résumé du lundi",
    detail: "Vos chiffres de la semaine et les 3 nouveaux insights.",
  },
] as const;

export type AlertId = (typeof ALERTS)[number]["id"];
export const ALERT_IDS = ALERTS.map((alert) => alert.id) as [AlertId, ...AlertId[]];

export type AlertSettings = {
  disabledAlerts: AlertId[];
  emailEnabled: boolean;
  slackConnected: boolean;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  disabledAlerts: [],
  emailEnabled: true,
  slackConnected: false,
};

export const alertPreferencesSchema = z.object({
  disabledAlerts: z.array(z.enum(ALERT_IDS)).max(ALERTS.length),
  emailEnabled: z.boolean(),
});

/** Même règle que la base : un webhook entrant Slack, rien d'autre. */
export const slackWebhookSchema = z
  .string()
  .trim()
  .regex(
    /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_/-]{10,200}$/,
    "Collez l'adresse fournie par Slack : elle commence par https://hooks.slack.com/services/",
  );
