// Détail d'un client et raisons de départ, tirés de Stripe (fonctions pures, testées). Rien
// n'est supposé : une raison absente est dite absente, une chronologie ne montre que des faits.

import { everPaid, paidFrom, time } from "./history";

export type DetailSubscription = {
  id: string;
  customer_id: string;
  status: string;
  mrr_cents: number;
  plan_name: string | null;
  created_at: string;
  ended_at: string | null;
  trial_end?: string | null;
  cancel_at_period_end: boolean;
  cancel_at?: string | null;
  current_period_end: string | null;
  cancel_reason?: string | null;
  cancel_feedback?: string | null;
};

export type TimelineEvent = {
  date: string;
  label: string;
  tone: "neutral" | "warning" | "positive";
};

/** Facture d'abonnement (payée ou en cours) : montant réellement payé, à sa date. */
export type PaidInvoice = {
  subscription_id: string | null;
  status: string;
  period_start: string | null;
  amount_paid_cents?: number | null;
};
/** Facture refusée, encore ouverte. */
export type RefusedInvoice = {
  customer_id: string | null;
  amount_due_cents: number;
  attempt_count: number;
  created_at?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 })
    .format(cents / 100)
    .replace(/ /g, " ");
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Raisons déclarées par le client au portail de résiliation de Stripe. */
export const DECLARED_LABELS: Record<string, string> = {
  too_expensive: "Trop cher",
  missing_features: "Il manque une fonctionnalité",
  switched_service: "Passé chez un concurrent",
  unused: "Ne s'en sert plus",
  customer_service: "Service client décevant",
  too_complex: "Trop compliqué",
  low_quality: "Qualité insuffisante",
  other: "Autre raison",
};

export type Reason = { label: string; share: number };
export type Departures = {
  /** Clients partis sur la période. */
  total: number;
  /** Ce que les clients ont répondu (portail Stripe), et combien ont répondu. */
  declared: Reason[];
  answered: number;
  /** Ce que montrent les faits : paiement échoué, ancienneté au départ. */
  observed: Reason[];
  /** Constat et action, seulement quand les chiffres le disent clairement. */
  tip: string | null;
};

const shares = (counts: Map<string, number>, total: number): Reason[] =>
  [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, share: Math.round((count / total) * 100) }));

const EARLY_DAYS = 90;

/**
 * Raisons de départ des clients partis : pour chacun, le dernier abonnement arrêté. Observées
 * (exclusives) : paiement échoué, paiement contesté, résiliation dans les 3 premiers mois ou
 * après, raison non enregistrée.
 */
export function departureReasons(lastEnded: DetailSubscription[], firstPaid: Map<string, number>) {
  const total = lastEnded.length;
  const declared = new Map<string, number>();
  const observed = new Map<string, number>();
  let answered = 0;
  let involuntary = 0;
  let early = 0;
  for (const sub of lastEnded) {
    const label = sub.cancel_feedback ? DECLARED_LABELS[sub.cancel_feedback] : undefined;
    if (label) {
      answered += 1;
      declared.set(label, (declared.get(label) ?? 0) + 1);
    }
    const ended = time(sub.ended_at) ?? 0;
    const tenure = ended - (firstPaid.get(sub.customer_id) ?? paidFrom(sub));
    let kind: string;
    if (sub.cancel_reason === "payment_failed") {
      kind = "Paiement échoué : départ involontaire";
      involuntary += 1;
    } else if (sub.cancel_reason === "payment_disputed") {
      kind = "Paiement contesté";
    } else if (sub.cancel_reason === "cancellation_requested") {
      if (tenure < EARLY_DAYS * DAY_MS) {
        kind = "Résiliation dans les 3 premiers mois";
        early += 1;
      } else {
        kind = "Résiliation après plus de 3 mois";
      }
    } else {
      kind = "Raison non enregistrée par Stripe";
    }
    observed.set(kind, (observed.get(kind) ?? 0) + 1);
  }
  const declaredList = answered ? shares(declared, answered) : [];
  let tip: string | null = null;
  if (total >= 3 && involuntary / total >= 0.3) {
    tip =
      "Près d'un départ sur trois vient d'un paiement échoué, pas d'une décision : activez les relances automatiques et la mise à jour des cartes dans Stripe.";
  } else if (total >= 3 && early / total >= 0.4) {
    tip =
      "Beaucoup partent dans leurs 3 premiers mois : soignez l'accompagnement des nouveaux clients (premier email, appel de bienvenue, guide de démarrage).";
  } else if (answered >= 3 && declaredList[0]?.label === DECLARED_LABELS.too_expensive) {
    tip =
      "« Trop cher » arrive en tête : proposez une offre annuelle ou plus petite avant de baisser vos prix.";
  } else if (total > 0 && answered === 0) {
    tip =
      "Aucun client n'a dit pourquoi il partait : activez la question de départ dans Stripe (Paramètres › Portail client › Résiliations).";
  }
  return {
    total,
    declared: declaredList,
    answered,
    observed: total ? shares(observed, total) : [],
    tip,
  } satisfies Departures;
}

/** Chronologie d'un client, du plus récent au plus ancien (8 faits au plus). */
export function customerTimeline(
  subs: DetailSubscription[],
  paid: PaidInvoice[],
  refused: RefusedInvoice[],
  now: number,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const ids = new Set(subs.map((sub) => sub.id));
  for (const sub of subs) {
    const plan = sub.plan_name ? ` ${sub.plan_name}` : "";
    const trialEnd = time(sub.trial_end);
    const hadTrial = trialEnd !== null && trialEnd > Date.parse(sub.created_at);
    events.push({
      date: sub.created_at,
      label: hadTrial ? `Essai${plan} démarré` : `Abonnement${plan} démarré`,
      tone: "positive",
    });
    if (hadTrial && trialEnd! <= now && everPaid(sub)) {
      events.push({
        date: sub.trial_end!,
        label: "Essai converti en abonnement payant",
        tone: "positive",
      });
    }
    const cancelAt = sub.cancel_at_period_end ? sub.current_period_end : (sub.cancel_at ?? null);
    if (!sub.ended_at && cancelAt && Date.parse(cancelAt) > now) {
      events.push({
        date: new Date(Math.min(now, Date.parse(cancelAt))).toISOString(),
        label: `Résiliation programmée pour le ${dayMonth(cancelAt)}`,
        tone: "warning",
      });
    }
    if (sub.ended_at) {
      events.push({ date: sub.ended_at, label: `Abonnement${plan} arrêté`, tone: "warning" });
    }
  }
  for (const invoice of paid) {
    if (!invoice.subscription_id || !ids.has(invoice.subscription_id)) continue;
    if (invoice.status !== "paid" || !invoice.period_start || !invoice.amount_paid_cents) continue;
    events.push({
      date: invoice.period_start,
      label: `Paiement reçu : ${euros(invoice.amount_paid_cents)}`,
      tone: "neutral",
    });
  }
  for (const invoice of refused) {
    events.push({
      date: invoice.created_at ?? new Date(now).toISOString(),
      label: `Paiement refusé : ${euros(invoice.amount_due_cents)} (${invoice.attempt_count} tentative${invoice.attempt_count > 1 ? "s" : ""})`,
      tone: "warning",
    });
  }
  return events
    .filter((event) => Date.parse(event.date) <= now)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 8);
}

/**
 * Phrase d'accroche de l'email de relance, selon la première raison du risque. Ton : clair,
 * direct, rassurant ; jamais de pression.
 */
export function retentionHook(kind: string, plan: string | null, periodEnd: string | null) {
  const offer = plan ? `votre abonnement ${plan}` : "votre abonnement";
  const date = periodEnd ? ` le ${dayMonth(periodEnd)}` : "";
  switch (kind) {
    case "cancel_scheduled":
      return `J'ai vu que ${offer} doit s'arrêter${date}. Avant cela, j'aimerais comprendre ce qui vous a manqué : votre retour compte, et il existe peut-être une solution simple.`;
    case "unpaid":
    case "past_due":
    case "failed_payment":
      return `Votre dernier paiement pour ${offer} n'a pas pu passer. Cela arrive souvent avec une carte renouvelée par la banque : la mise à jour prend deux minutes, et je reste disponible si besoin.`;
    case "card_expiring":
      return `Votre carte bancaire arrive à expiration avant le prochain renouvellement de ${offer}. Pour éviter toute coupure, pensez à la mettre à jour ; je peux vous envoyer le lien si besoin.`;
    case "annual_renewal":
      return `${offer.charAt(0).toUpperCase()}${offer.slice(1)} se renouvelle${date}. C'est le bon moment pour faire le point ensemble : ce qui vous sert, ce qui vous manque.`;
    default:
      return "Vous nous avez rejoints il y a peu : je voulais m'assurer que tout est bien en place pour vous, et répondre à vos questions.";
  }
}
