// Historique du revenu, client par client (fonctions pures, testées) : à chaque date, le revenu
// mensuel de chaque client, lu sur ses factures importées (montant réellement facturé, remises
// déduites), sinon sur le prix actuel de son abonnement. Comparer deux dates donne les quatre
// mouvements du revenu : nouveaux clients, expansion, contraction, départs. Tout se calcule dès
// la connexion de Stripe, sur l'historique déjà présent chez Stripe.

export type HistorySubscription = {
  id: string;
  customer_id: string;
  status: string;
  mrr_cents: number;
  created_at: string;
  ended_at: string | null;
  trial_end?: string | null;
};

/** Part récurrente d'une facture d'abonnement (normalize.ts, recurringPart). */
export type RecurringInvoiceRow = {
  subscription_id: string | null;
  status: string;
  recurring_cents: number | null;
  period_start: string | null;
  period_end: string | null;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Un mois, pour ramener le churn au mois quelle que soit la période choisie. */
export const MONTH_DAYS = 30;

/** Statuts qui comptent dans le revenu récurrent (past_due : Stripe retente encore). */
export const PAYING = new Set(["active", "past_due"]);
/** Jamais démarrés : ni revenu, ni churn. */
export const NEVER_STARTED = new Set(["incomplete", "incomplete_expired"]);
/** Pas encore payé : essai en cours, ou essai fini sans moyen de paiement (paused). */
const NOT_PAID_YET = new Set(["trialing", "paused"]);

export const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

/** Début du revenu : fin de l'essai s'il y en a eu un, sinon création de l'abonnement. */
export const paidFrom = (sub: HistorySubscription) =>
  Math.max(Date.parse(sub.created_at), time(sub.trial_end) ?? 0);

/** A rapporté de l'argent : ni jamais démarré, ni encore en essai, ni arrêté pendant l'essai. */
export function everPaid(sub: HistorySubscription) {
  if (NEVER_STARTED.has(sub.status) || NOT_PAID_YET.has(sub.status)) return false;
  const ended = time(sub.ended_at);
  return ended === null || ended > paidFrom(sub);
}

/** Abonnement payant à l'instant t (période d'essai exclue). */
export function payingAt(sub: HistorySubscription, t: number) {
  if (!everPaid(sub)) return false;
  const ended = time(sub.ended_at);
  return paidFrom(sub) <= t && (ended === null || ended > t);
}

/** Abonnement compté dans le revenu actuel (un impayé abandonné par Stripe n'y est plus). */
export const isCurrent = (sub: HistorySubscription) => PAYING.has(sub.status) && !sub.ended_at;

type Segment = { start: number; end: number; cents: number };

/** Montant facturé par abonnement, période par période (factures payées ou en cours). */
export function segmentsBySubscription(rows: RecurringInvoiceRow[]) {
  const map = new Map<string, Segment[]>();
  for (const row of rows) {
    if (!row.subscription_id || row.recurring_cents === null) continue;
    if (!row.period_start || !row.period_end) continue;
    if (row.status !== "paid" && row.status !== "open") continue;
    const list = map.get(row.subscription_id) ?? [];
    list.push({
      start: Date.parse(row.period_start),
      end: Date.parse(row.period_end),
      cents: row.recurring_cents,
    });
    map.set(row.subscription_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.start - b.start);
  return map;
}

export type Segments = ReturnType<typeof segmentsBySubscription>;

/** Dernier montant facturé (abonnement à paliers ou à l'usage : son revenu estimé). */
export function lastBilled(segments: Segments, subscriptionId: string) {
  return segments.get(subscriptionId)?.at(-1)?.cents ?? null;
}

/**
 * Revenu mensuel d'un abonnement à la date t : la facture qui couvre t (ou la dernière avant),
 * sinon la plus ancienne connue, sinon le prix actuel.
 */
export function amountAt(sub: HistorySubscription, t: number, segments: Segments) {
  const list = segments.get(sub.id);
  if (!list?.length) return sub.mrr_cents;
  let found = list[0];
  for (const segment of list) {
    if (segment.start > t) break;
    found = segment;
  }
  return found.cents;
}

/** Revenu mensuel de chaque client à la date t (now : le revenu affiché, au prix actuel). */
export function customerMrr(
  subs: HistorySubscription[],
  t: number,
  segments: Segments,
  isNow = false,
) {
  const map = new Map<string, number>();
  for (const sub of subs) {
    if (isNow ? !isCurrent(sub) : !payingAt(sub, t)) continue;
    const cents = isNow ? sub.mrr_cents : amountAt(sub, t, segments);
    map.set(sub.customer_id, (map.get(sub.customer_id) ?? 0) + cents);
  }
  return map;
}

export type Flows = {
  start: number;
  newMrr: number;
  expansion: number;
  contraction: number;
  churned: number;
};

/**
 * Mouvements du revenu entre a et b, client par client (centimes). Toujours :
 * revenu en a + nouveaux + expansion − contraction − départs = revenu en b.
 */
export function flowsBetween(
  subs: HistorySubscription[],
  a: number,
  b: number,
  segments: Segments,
  bIsNow = false,
): Flows {
  const before = customerMrr(subs, a, segments);
  const after = customerMrr(subs, b, segments, bIsNow);
  const flows = { start: 0, newMrr: 0, expansion: 0, contraction: 0, churned: 0 };
  for (const [customer, cents] of before) {
    flows.start += cents;
    const next = after.get(customer);
    if (next === undefined) flows.churned += cents;
    else if (next > cents) flows.expansion += next - cents;
    else flows.contraction += cents - next;
  }
  for (const [customer, cents] of after) {
    if (!before.has(customer)) flows.newMrr += cents;
  }
  return flows;
}

/**
 * Clients payants en a, et ceux qui n'ont plus d'abonnement en b. Un client qui change d'offre
 * (résiliation puis nouvel abonnement) reste un client.
 */
export function customerMoves(subs: HistorySubscription[], a: number, b: number) {
  const atStart = new Set(subs.filter((sub) => payingAt(sub, a)).map((sub) => sub.customer_id));
  const stillThere = new Set(
    subs
      .filter((sub) => sub.status !== "trialing" || time(sub.ended_at) === null)
      .filter((sub) => {
        const ended = time(sub.ended_at);
        return Date.parse(sub.created_at) <= b && (ended === null || ended > b);
      })
      .map((sub) => sub.customer_id),
  );
  return { atStart, lost: [...atStart].filter((id) => !stillThere.has(id)) };
}

const round1 = (value: number) => Math.round(value * 1000) / 10;

/**
 * Churn ramené au mois, quelle que soit la période : la période est découpée en mois, les
 * départs de chaque mois sont rapportés aux clients du début de ce mois (les clients arrivés
 * puis partis en cours de période comptent), et une période plus courte est ramenée au mois.
 * Churn en revenu : départs et baisses d'offre, rapportés au revenu du début de chaque mois.
 */
export function monthlyChurn(
  subs: HistorySubscription[],
  start: number,
  end: number,
  segments: Segments,
  endIsNow = false,
) {
  const months = Math.max(1, Math.round((end - start) / DAY_MS / MONTH_DAYS));
  const width = (end - start) / months;
  let customers = 0;
  let lost = 0;
  let startCents = 0;
  let lostCents = 0;
  for (let i = 0; i < months; i++) {
    const a = start + i * width;
    const b = i === months - 1 ? end : a + width;
    const moves = customerMoves(subs, a, b);
    customers += moves.atStart.size;
    lost += moves.lost.length;
    const flows = flowsBetween(subs, a, b, segments, endIsNow && i === months - 1);
    startCents += flows.start;
    lostCents += flows.churned + flows.contraction;
  }
  const perMonth = (rate: number) =>
    1 - Math.pow(1 - Math.min(1, rate), MONTH_DAYS / (width / DAY_MS));
  return {
    customer: customers ? round1(perMonth(lost / customers)) : 0,
    revenue: startCents ? round1(perMonth(lostCents / startCents)) : 0,
  };
}

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const SHORT_MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/** Nombre de tranches du graphique : jours, groupes de jours, semaines ou mois. */
const BUCKETS: Record<number, number> = { 7: 7, 30: 6, 90: 13, 365: 12 };

export type RevenueBucket = {
  label: string;
  newMrr: number;
  expansion: number;
  contraction: number;
  lost: number;
};

/** Mouvements du revenu tranche par tranche (graphique de l'accueil), en euros. */
export function flowBuckets(
  subs: HistorySubscription[],
  start: number,
  end: number,
  segments: Segments,
  days: number,
): RevenueBucket[] {
  const count = BUCKETS[days] ?? 6;
  const width = (end - start) / count;
  const euros = (cents: number) => Math.round(cents) / 100;
  return Array.from({ length: count }, (_, i) => {
    const a = start + i * width;
    const b = i === count - 1 ? end : a + width;
    const flows = flowsBetween(subs, a, b, segments, i === count - 1);
    return {
      label: (days >= 365 ? SHORT_MONTH : SHORT_DATE).format(new Date(b - 1)),
      newMrr: euros(flows.newMrr),
      expansion: euros(flows.expansion),
      contraction: euros(flows.contraction),
      lost: euros(flows.churned),
    };
  });
}

export type Cohort = { label: string; size: number; retention: number[] };

const COHORT_LABEL = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });

/**
 * Rétention par cohorte : les clients regroupés par mois de leur premier paiement, puis la part
 * encore payante à la fin de chaque mois suivant (mois 0 = 100 %). Les 12 derniers mois.
 */
export function cohorts(subs: HistorySubscription[], now: Date, count = 12): Cohort[] {
  const firstPaid = new Map<string, number>();
  for (const sub of subs) {
    if (!everPaid(sub)) continue;
    const t = paidFrom(sub);
    const known = firstPaid.get(sub.customer_id);
    if (known === undefined || t < known) firstPaid.set(sub.customer_id, t);
  }
  const bySubscriber = new Map<string, HistorySubscription[]>();
  for (const sub of subs) {
    const list = bySubscriber.get(sub.customer_id) ?? [];
    list.push(sub);
    bySubscriber.set(sub.customer_id, list);
  }
  const monthStart = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth() + offset, 1).getTime();

  const result: Cohort[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const from = monthStart(-i);
    const to = monthStart(-i + 1);
    const members = [...firstPaid].filter(([, t]) => t >= from && t < to).map(([id]) => id);
    if (!members.length) continue;
    const retention = [100];
    // Fin de chaque mois écoulé depuis l'arrivée (le mois en cours n'est pas encore fini).
    for (let k = 1; monthStart(-i + k + 1) <= now.getTime(); k++) {
      const t = monthStart(-i + k + 1) - 1;
      const kept = members.filter((id) =>
        (bySubscriber.get(id) ?? []).some((sub) => payingAt(sub, t)),
      ).length;
      retention.push(Math.round((kept / members.length) * 100));
    }
    result.push({ label: COHORT_LABEL.format(new Date(from)), size: members.length, retention });
  }
  return result;
}

/**
 * Essais terminés sur la période (fin d'essai, ou arrêt pendant l'essai) et ceux devenus payants.
 * Null s'il n'y en a aucun.
 */
export function trialConversion(subs: HistorySubscription[], start: number, end: number) {
  const outcomes = subs.flatMap((sub) => {
    const trialEnd = time(sub.trial_end);
    if (trialEnd === null || trialEnd <= Date.parse(sub.created_at)) return [];
    const ended = time(sub.ended_at);
    const decided = ended !== null ? Math.min(trialEnd, ended) : trialEnd;
    return decided > start && decided <= end ? [everPaid(sub)] : [];
  });
  if (!outcomes.length) return null;
  const converted = outcomes.filter(Boolean).length;
  return {
    ended: outcomes.length,
    converted,
    rate: Math.round((converted / outcomes.length) * 1000) / 10,
  };
}

/**
 * Devise principale (celle du plus grand nombre d'abonnements payants) : les montants ne
 * s'additionnent que dans une même devise ; les autres sont signalées, jamais converties au hasard.
 */
export function mainCurrency(subs: (HistorySubscription & { currency?: string })[]) {
  const counts = new Map<string, number>();
  const pool = subs.some(isCurrent) ? subs.filter(isCurrent) : subs;
  for (const sub of pool) {
    const currency = sub.currency ?? "eur";
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }
  // À égalité, l'euro d'abord, puis l'ordre alphabétique : un résultat toujours identique.
  return (
    [...counts].sort(
      (a, b) =>
        b[1] - a[1] || Number(b[0] === "eur") - Number(a[0] === "eur") || a[0].localeCompare(b[0]),
    )[0]?.[0] ?? "eur"
  );
}
