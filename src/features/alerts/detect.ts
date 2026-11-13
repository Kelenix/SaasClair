import type { AlertId } from "@/features/dashboard/alerts/catalog";
import { weekKey, type RealInsight } from "@/features/insights/engine";
import type { RealRevenue } from "@/features/stripe/metrics";
import { formatEuro, formatNumber, formatPercent } from "@/lib/format";

// Alertes à envoyer (fonctions pures, testées) : ce qui vient d'arriver, une ligne par fait.
// Chaque fait a une clé : il n'est envoyé qu'une fois (journal alert_deliveries). Ton : clair,
// direct, rassurant ; le chiffre d'abord, l'action ensuite.

export type AlertEvent = {
  alertId: AlertId;
  key: string;
  line: string;
  href: string;
  /** Qui ou quoi (nom du client), pour l'objet de l'email quand il est seul. */
  label?: string;
};

export type AlertFacts = {
  now: Date;
  revenue: RealRevenue | null;
  /** Dernière visite reçue (null : aucune), et visiteurs des 7 derniers jours. */
  lastVisitAt: string | null;
  visitors7d: number;
  /** Visiteurs des dernières 24 heures et des 24 heures d'avant. */
  traffic: { last: number; previous: number } | null;
  /** Part des visiteurs qui atteignent la dernière étape du tunnel, cette semaine et la précédente. */
  conversion: {
    step: string;
    current: { visitors: number; reached: number };
    previous: { visitors: number; reached: number };
  } | null;
  /** Insights de la semaine, pour le résumé du lundi. */
  insights: RealInsight[];
};

const HOUR_MS = 60 * 60 * 1000;
/** Silence anormal : 6 heures sans visite, pour un site qui en reçoit au moins 200 par semaine. */
const SILENCE_MS = 6 * HOUR_MS;
const SILENCE_MIN_WEEKLY = 200;
/** Chute des visites : plus de 30 % sur 24 heures, à partir de 50 visiteurs la veille. */
const TRAFFIC_DROP = 0.3;
const TRAFFIC_MIN = 50;
/** Baisse de conversion : plus de 15 % sur 7 jours, à partir de 100 visiteurs par semaine. */
const CONVERSION_DROP = 0.15;
const CONVERSION_MIN = 100;

const PARIS = "Europe/Paris";
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: PARIS,
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: PARIS, day: "numeric", month: "long" });
const dayKey = (now: Date) => now.toLocaleDateString("sv-SE", { timeZone: PARIS });
const monthKey = (now: Date) => dayKey(now).slice(0, 7);

/** Lundi, à partir de 8 heures (heure de Paris) : le moment du résumé de la semaine. */
export function isDigestTime(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return weekday === "Mon" && hour >= 8;
}

export function detectAlerts(facts: AlertFacts): AlertEvent[] {
  const { now, revenue } = facts;
  const events: AlertEvent[] = [];

  // Clients qui passent « à retenir » : une alerte par client et par mois au plus.
  for (const risk of revenue?.atRisk ?? []) {
    if (risk.level !== "retain") continue;
    events.push({
      alertId: "churn-risk",
      key: `${risk.customerId}:${monthKey(now)}`,
      label: risk.name,
      line: `${risk.name} (${formatEuro(risk.mrr)} par mois) : ${risk.reasons
        .map((reason) => reason.label.toLowerCase())
        .join(", ")}${risk.periodEnd ? `. Échéance le ${dayMonth(risk.periodEnd)}` : ""}.`,
      href: `/app/churn?client=${encodeURIComponent(risk.customerId)}`,
    });
  }

  // Paiements refusés : une alerte par facture.
  for (const invoice of revenue?.failedInvoices ?? []) {
    events.push({
      alertId: "failed-payment",
      key: invoice.id,
      label: invoice.customer,
      line: `${invoice.customer} : ${formatEuro(invoice.amount)} refusés après ${invoice.attempts} tentative${invoice.attempts > 1 ? "s" : ""}${invoice.nextAttempt ? `, nouvel essai de Stripe le ${dayMonth(invoice.nextAttempt)}` : ""}.`,
      href: "/app/revenus",
    });
  }

  // Script silencieux : une alerte par silence (la clé est la dernière visite reçue).
  if (
    facts.lastVisitAt &&
    facts.visitors7d >= SILENCE_MIN_WEEKLY &&
    now.getTime() - Date.parse(facts.lastVisitAt) > SILENCE_MS
  ) {
    events.push({
      alertId: "script-silent",
      key: facts.lastVisitAt,
      line: `Aucune visite reçue depuis le ${dateTime(facts.lastVisitAt)}. Vérifiez que la ligne SaasClair est toujours sur votre site : une mise à jour du site l'efface parfois.`,
      href: "/configuration?etape=script",
    });
  }

  // Chute des visites sur 24 heures : une alerte par jour au plus.
  const traffic = facts.traffic;
  if (
    traffic &&
    traffic.previous >= TRAFFIC_MIN &&
    traffic.last < traffic.previous * (1 - TRAFFIC_DROP)
  ) {
    const drop = Math.round((1 - traffic.last / traffic.previous) * 100);
    events.push({
      alertId: "traffic-drop",
      key: dayKey(now),
      line: `${formatNumber(traffic.last)} visiteurs ces dernières 24 heures, contre ${formatNumber(traffic.previous)} la veille (−${drop} %). Vérifiez vos campagnes et que votre site répond.`,
      href: "/app/acquisition",
    });
  }

  // Baisse de conversion sur 7 jours : une alerte par semaine au plus.
  const conversion = facts.conversion;
  if (
    conversion &&
    conversion.current.visitors >= CONVERSION_MIN &&
    conversion.previous.visitors >= CONVERSION_MIN
  ) {
    const rate = (part: { visitors: number; reached: number }) =>
      (part.reached / part.visitors) * 100;
    const current = rate(conversion.current);
    const previous = rate(conversion.previous);
    if (previous > 0 && current < previous * (1 - CONVERSION_DROP)) {
      events.push({
        alertId: "conversion-drop",
        key: weekKey(now),
        line: `Sur 7 jours, ${formatPercent(current)} de vos visiteurs atteignent l'étape « ${conversion.step} », contre ${formatPercent(previous)} la semaine d'avant.`,
        href: "/app/tunnel",
      });
    }
  }

  // Résumé du lundi : une fois par semaine.
  if (isDigestTime(now)) {
    const lines: string[] = [];
    if (revenue) {
      lines.push(
        `Revenu mensuel récurrent : ${formatEuro(revenue.mrr)} ; churn : ${formatPercent(revenue.customerChurn)} par mois.`,
      );
      lines.push(
        revenue.atRisk.length
          ? `${revenue.atRisk.length} client${revenue.atRisk.length > 1 ? "s" : ""} à surveiller, pour ${formatEuro(revenue.mrrAtRisk)} par mois.`
          : "Aucun client à risque cette semaine.",
      );
    }
    lines.push(`${formatNumber(facts.visitors7d)} visiteurs ces 7 derniers jours.`);
    for (const insight of facts.insights.slice(0, 3)) {
      lines.push(`${insight.title} À faire : ${insight.action}`);
    }
    events.push({
      alertId: "weekly-digest",
      key: weekKey(now),
      line: lines.join("\n"),
      href: "/app",
    });
  }
  return events;
}

export type AlertMessage = { subject: string; intro: string; lines: string[]; href: string };

/** Un message par type d'alerte, avec tous les faits nouveaux de ce passage. */
export function composeAlert(alertId: AlertId, events: AlertEvent[]): AlertMessage {
  const count = events.length;
  const lines = events.flatMap((event) => event.line.split("\n"));
  const href = count === 1 ? events[0].href : events[0].href.split("?")[0];
  switch (alertId) {
    case "churn-risk":
      return {
        subject:
          count === 1
            ? `${events[0].label} risque de partir`
            : `${count} clients risquent de partir`,
        intro: "Vous avez encore le temps de les retenir. Un email ou un appel suffit souvent.",
        lines,
        href,
      };
    case "failed-payment":
      return {
        subject:
          count === 1
            ? `Paiement refusé : ${events[0].label}`
            : `${count} paiements ont été refusés`,
        intro:
          "Stripe va réessayer. Un mot au client pour mettre sa carte à jour double vos chances.",
        lines,
        href,
      };
    case "script-silent":
      return {
        subject: "Votre site ne nous envoie plus de visites",
        intro: "Rien de grave pour vos données : elles reprendront dès que la ligne sera revenue.",
        lines,
        href,
      };
    case "traffic-drop":
      return {
        subject: "Vos visites baissent fortement aujourd'hui",
        intro: "Une baisse d'un jour arrive. Voici les chiffres pour juger.",
        lines,
        href,
      };
    case "conversion-drop":
      return {
        subject: "Votre conversion recule cette semaine",
        intro: "Votre tunnel montre où les visiteurs s'arrêtent.",
        lines,
        href,
      };
    case "weekly-digest":
      return { subject: "Votre semaine avec SaasClair", intro: "Bonjour,", lines, href };
  }
}
