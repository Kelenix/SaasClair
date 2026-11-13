import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { slackWebhookSchema } from "@/features/dashboard/alerts/catalog";
import { SITE_URL } from "@/lib/site";
import type { AlertMessage } from "./detect";

// Envoi des alertes : email (le même SMTP que les emails de connexion, Resend en production) et
// Slack (webhook entrant fourni par l'utilisateur). Sans SMTP (poste local, CI), rien ne part.

let transport: Transporter | null | undefined;

function mailer() {
  if (transport !== undefined) return transport;
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transport =
    host && user && pass
      ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
      : null;
  return transport;
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

/** Email aux couleurs de SaasClair : fond crème, carte blanche, titres vert forêt. */
export function renderEmail(message: AlertMessage, firstName: string) {
  const url = `${SITE_URL}${message.href}`;
  const settings = `${SITE_URL}/app/insights`;
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const intro = message.intro === "Bonjour," ? "" : message.intro;
  const text = [
    greeting,
    intro,
    ...message.lines.map((line) => `• ${line}`),
    `Voir dans SaasClair : ${url}`,
    `Choisir les alertes reçues : ${settings}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#FAF7F0;font-family:Inter,Arial,sans-serif;color:#0F1F1A">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-weight:600;color:#064E3B">SaasClair</p>
<div style="background:#ffffff;border:1px solid #E6E0D2;border-radius:20px;padding:28px">
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;line-height:1.3;color:#064E3B">${escapeHtml(message.subject)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${escapeHtml(greeting)}${intro ? ` ${escapeHtml(intro)}` : ""}</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.6">${message.lines
    .map((line) => `<li style="margin-bottom:8px">${escapeHtml(line)}</li>`)
    .join("")}</ul>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#064E3B;color:#FAF7F0;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">Voir dans SaasClair</a>
</div>
<p style="margin:20px 0 0;font-size:12px;color:#5B6B65">Vous recevez cet email car cette alerte est active sur votre compte. <a href="${escapeHtml(settings)}" style="color:#064E3B">Choisir les alertes reçues</a>.</p>
</div></body></html>`;
  return { subject: message.subject, text, html };
}

/** Adresse d'envoi : SMTP_SENDER, présentée comme « SaasClair ». */
const sender = () => {
  const address = process.env.SMTP_SENDER ?? "";
  return address.includes("<") ? address : `"SaasClair" <${address}>`;
};

export async function sendAlertEmail(to: string, message: AlertMessage, firstName: string) {
  const smtp = mailer();
  if (!smtp || !process.env.SMTP_SENDER) return false;
  const email = renderEmail(message, firstName);
  await smtp.sendMail({ from: sender(), to, ...email });
  return true;
}

/** Message Slack : l'objet en gras, puis une ligne par fait et le lien. */
export async function sendAlertSlack(webhook: string, message: AlertMessage) {
  // Même règle que l'enregistrement : jamais une autre adresse que les webhooks de Slack.
  if (!slackWebhookSchema.safeParse(webhook).success) return false;
  const text = [
    `*${message.subject}*`,
    ...message.lines.map((line) => `• ${line}`),
    `<${SITE_URL}${message.href}|Voir dans SaasClair>`,
  ].join("\n");
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return Boolean(response?.ok);
}
