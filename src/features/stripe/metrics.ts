import { PERIOD_DAYS, type Period } from "@/features/dashboard/period";

// Revenus et churn calculés sur les données Stripe importées (fonctions pures, testées).
// Montants en euros (centimes ÷ 100). Sans historique des changements d'offre, l'expansion et
// la contraction ne sont pas encore mesurées (registre de la dette technique).

export type SubscriptionRow = {
  id: string;
  customer_id: string;
  status: string;
  mrr_cents: number;
  plan_name: string | null;
  created_at: string;
  ended_at: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  /** Résiliation programmée à une date précise (Stripe `cancel_at`). */
  cancel_at?: string | null;
  /** Fin de l'essai gratuit : le revenu ne compte qu'à partir de cette date. */
  trial_end?: string | null;
  /** Rythme de facturation (month, year…). */
  billing_interval?: string | null;
  /** Fin du mois d'expiration de la carte qui paie l'abonnement. */
  card_expires_at?: string | null;
};
export type InvoiceRow = {
  id: string;
  customer_id: string | null;
  status: string;
  amount_due_cents: number;
  attempt_count: number;
  next_payment_attempt: string | null;
};
export type CustomerRow = { id: string; name: string | null; email: string | null };

export type RiskReason =
  | "cancel_scheduled"
  | "unpaid"
  | "past_due"
  | "failed_payment"
  | "card_expiring"
  | "annual_renewal"
  | "new_customer";
export type AtRisk = {
  customerId: string;
  name: string;
  email: string | null;
  mrr: number;
  /** Somme des points de chaque raison, plafonnée à 99 (voir RISK_POINTS). */
  score: number;
  /** « À retenir » (60 et plus) ou « à surveiller » (35 à 59). */
  level: "retain" | "watch";
  reasons: { kind: RiskReason; label: string }[];
  /** Fin de période (résiliation ou prochain renouvellement). */
  periodEnd: string | null;
};
export type FailedInvoice = {
  id: string;
  customer: string;
  amount: number;
  attempts: number;
  nextAttempt: string | null;
};

export type RealRevenue = {
  mrr: number;
  startMrr: number;
  newMrr: number;
  churnedMrr: number;
  activeSubscriptions: number;
  trialing: number;
  /** Clients payants au début de la période qui n'ont plus d'abonnement à la fin ÷ clients payants au début (%). */
  customerChurn: number;
  /** Revenu perdu des abonnements payants au début ÷ revenu au début de la période (%). */
  revenueChurn: number;
  /** Revenu mensuel à chaque fin de mois, sur 12 mois. */
  history: { label: string; mrr: number }[];
  atRisk: AtRisk[];
  mrrAtRisk: number;
  failedInvoices: FailedInvoice[];
  failedAmount: number;
  /** La période précédente, de même durée (pour comparer). */
  previous: {
    customerChurn: number;
    revenueChurn: number;
    newMrr: number;
    churnedMrr: number;
    customersAtStart: number;
    lostCustomers: number;
  };
  /** Clients ayant au moins un abonnement payant aujourd'hui. */
  payingCustomers: number;
  /** Clients partis sur la période (payants au début, plus d'abonnement à la fin). */
  lostCustomerNames: string[];
  /** Essais qui se terminent dans les 7 prochains jours. */
  trialsEnding: {
    customerId: string;
    name: string;
    email: string | null;
    mrr: number;
    trialEnd: string;
  }[];
  /** Offres qui perdent le plus de clients sur la période. */
  lostByPlan: { plan: string; customers: number; mrr: number }[];
  /** Plus gros client et sa part du revenu actuel (%). */
  topCustomer: { name: string; mrr: number; share: number } | null;
  /** Revenu mensuel actuel de chaque client payant (euros), pour le relier à son canal. */
  customerMrr: Record<string, number>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** Statuts qui comptent dans le revenu récurrent (past_due : Stripe retente encore). */
const PAYING = new Set(["active", "past_due"]);
/** Jamais démarrés : ni revenu, ni churn. */
const NEVER_STARTED = new Set(["incomplete", "incomplete_expired"]);

const time = (iso: string | null) => (iso ? Date.parse(iso) : null);
const euros = (cents: number) => Math.round(cents) / 100;
const percent = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

/** Début du revenu : fin de l'essai s'il y en a eu un, sinon création de l'abonnement. */
const paidFrom = (sub: SubscriptionRow) =>
  Math.max(Date.parse(sub.created_at), time(sub.trial_end ?? null) ?? 0);

/** A rapporté de l'argent : ni jamais démarré, ni encore en essai, ni arrêté pendant l'essai. */
function everPaid(sub: SubscriptionRow) {
  if (NEVER_STARTED.has(sub.status) || sub.status === "trialing") return false;
  const ended = time(sub.ended_at);
  return ended === null || ended > paidFrom(sub);
}

/** Abonnement payant à l'instant t (période d'essai exclue). */
function payingAt(sub: SubscriptionRow, t: number) {
  if (!everPaid(sub)) return false;
  const ended = time(sub.ended_at);
  return paidFrom(sub) <= t && (ended === null || ended > t);
}

const endedWithin = (sub: SubscriptionRow, start: number, end: number) => {
  const t = time(sub.ended_at);
  return t !== null && t > start && t <= end;
};

const MONTHS = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/**
 * Score de risque explicable : chaque raison ajoute ses points, plafonnés à 99. Un client entre
 * dans la liste à partir de 35 points (« à surveiller »), et devient « à retenir » à 60.
 * Les petites raisons (renouvellement annuel proche, client récent) aggravent un risque, mais ne
 * suffisent pas seules. Points à ajuster sur les départs réellement observés (lot B).
 */
export const RISK_POINTS: Record<Exclude<RiskReason, "failed_payment">, number> = {
  cancel_scheduled: 90,
  unpaid: 60,
  past_due: 20,
  card_expiring: 35,
  annual_renewal: 10,
  new_customer: 10,
};
/** Paiements échoués : 40 points, +10 par facture de plus, 60 au plus. */
const failedPoints = (count: number) => Math.min(60, 40 + (count - 1) * 10);
export const WATCH_SCORE = 35;
export const RETAIN_SCORE = 60;
const ORDER: RiskReason[] = [
  "cancel_scheduled",
  "unpaid",
  "past_due",
  "failed_payment",
  "card_expiring",
  "annual_renewal",
  "new_customer",
];
const NEW_CUSTOMER_DAYS = 90;
const RENEWAL_WINDOW_DAYS = 30;

const sum = (subs: SubscriptionRow[]) => subs.reduce((total, sub) => total + sub.mrr_cents, 0);

/** Mouvements d'une période [start, end] : payants au début, nouveaux, partis. */
function movements(started: SubscriptionRow[], start: number, end: number) {
  const atStart = started.filter((sub) => payingAt(sub, start));
  // Nouveau revenu : abonnements devenus payants pendant la période (essais convertis compris).
  const created = started.filter((sub) => {
    const t = paidFrom(sub);
    return everPaid(sub) && t > start && t <= end;
  });
  // Revenu perdu : abonnements payants arrêtés pendant la période (un essai annulé n'en est pas).
  const ended = started.filter((sub) => everPaid(sub) && endedWithin(sub, start, end));
  const endedFromStart = atStart.filter((sub) => endedWithin(sub, start, end));

  // Churn clients : un client qui change d'offre (résiliation puis nouvel abonnement) reste.
  const customersAtStart = new Set(atStart.map((sub) => sub.customer_id));
  const stillThere = new Set(
    started
      .filter((sub) => sub.status !== "trialing" || time(sub.ended_at) === null)
      .filter((sub) => {
        const t = time(sub.ended_at);
        return Date.parse(sub.created_at) <= end && (t === null || t > end);
      })
      .map((sub) => sub.customer_id),
  );
  const lostCustomerIds = [...customersAtStart].filter((id) => !stillThere.has(id));
  return { atStart, created, ended, endedFromStart, customersAtStart, lostCustomerIds };
}

const summaryOf = (m: ReturnType<typeof movements>) => ({
  customerChurn: percent(m.lostCustomerIds.length, m.customersAtStart.size),
  revenueChurn: percent(sum(m.endedFromStart), sum(m.atStart)),
  newMrr: euros(sum(m.created)),
  churnedMrr: euros(sum(m.ended)),
  customersAtStart: m.customersAtStart.size,
  lostCustomers: m.lostCustomerIds.length,
});

export function computeRevenue(
  subscriptions: SubscriptionRow[],
  invoices: InvoiceRow[],
  customers: CustomerRow[],
  period: Period,
  now: Date,
): RealRevenue {
  const end = now.getTime();
  const start = end - PERIOD_DAYS[period] * DAY_MS;
  const started = subscriptions.filter((sub) => !NEVER_STARTED.has(sub.status));

  const current = started.filter((sub) => PAYING.has(sub.status) && !sub.ended_at);
  const { atStart, created, ended, endedFromStart, customersAtStart, lostCustomerIds } = movements(
    started,
    start,
    end,
  );
  // Même calcul sur la période précédente, de même durée : pour dire si le churn monte ou baisse.
  const previous = movements(started, start - (end - start), start);
  const lostCustomers = lostCustomerIds.length;

  const history = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + i + 1, 1);
    const t = Math.min(month.getTime() - 1, end);
    return {
      label: MONTHS.format(new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)),
      mrr: euros(sum(started.filter((sub) => payingAt(sub, t)))),
    };
  });
  // Dernier point = le revenu affiché (un abonnement impayé n'y compte plus).
  history[history.length - 1].mrr = euros(sum(current));

  // Paiements échoués : factures encore ouvertes après au moins une tentative.
  const names = new Map(customers.map((c) => [c.id, c]));
  const failed = invoices.filter(
    (invoice) =>
      (invoice.status === "open" && invoice.attempt_count > 0) ||
      invoice.status === "uncollectible",
  );
  const failedByCustomer = new Map<string, number>();
  for (const invoice of failed) {
    if (invoice.customer_id) {
      failedByCustomer.set(
        invoice.customer_id,
        (failedByCustomer.get(invoice.customer_id) ?? 0) + 1,
      );
    }
  }

  // Clients à risque : chaque abonnement apporte ses raisons, réunies par client (sans doublon).
  const dayMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const byCustomerRisk = new Map<
    string,
    { reasons: Map<RiskReason, string>; cents: number; ends: string[] }
  >();
  for (const sub of current.concat(started.filter((s) => s.status === "unpaid"))) {
    const entry = byCustomerRisk.get(sub.customer_id) ?? {
      reasons: new Map<RiskReason, string>(),
      cents: 0,
      ends: [],
    };
    byCustomerRisk.set(sub.customer_id, entry);
    entry.cents += sub.mrr_cents;
    const add = (kind: RiskReason, label: string) => {
      if (!entry.reasons.has(kind)) entry.reasons.set(kind, label);
    };

    const cancelAt = time(sub.cancel_at ?? null);
    const cancelDate = sub.cancel_at_period_end
      ? sub.current_period_end
      : cancelAt !== null && cancelAt > end
        ? sub.cancel_at!
        : null;
    const isLeaving = cancelDate !== null || sub.cancel_at_period_end;
    if (isLeaving) {
      add(
        "cancel_scheduled",
        cancelDate ? `Résiliation programmée le ${dayMonth(cancelDate)}` : "Résiliation programmée",
      );
    }
    if (sub.status === "unpaid") add("unpaid", "Abonnement impayé");
    if (sub.status === "past_due") add("past_due", "Paiement en retard");
    const failedCount = failedByCustomer.get(sub.customer_id) ?? 0;
    if (failedCount) {
      add(
        "failed_payment",
        `${failedCount} paiement${failedCount > 1 ? "s" : ""} échoué${failedCount > 1 ? "s" : ""}`,
      );
    }

    const renewal = time(sub.current_period_end);
    const cardEnd = time(sub.card_expires_at ?? null);
    if (!isLeaving && renewal !== null && renewal > end && cardEnd !== null && cardEnd <= renewal) {
      // Le prochain prélèvement échouera : c'est la première cause de départ involontaire.
      add(
        "card_expiring",
        cardEnd <= end
          ? "Carte bancaire expirée"
          : `Carte qui expire avant le renouvellement du ${dayMonth(sub.current_period_end!)}`,
      );
    }
    if (
      !isLeaving &&
      sub.billing_interval === "year" &&
      renewal !== null &&
      renewal > end &&
      renewal <= end + RENEWAL_WINDOW_DAYS * DAY_MS
    ) {
      add("annual_renewal", `Renouvellement annuel le ${dayMonth(sub.current_period_end!)}`);
    }
    if (paidFrom(sub) > end - NEW_CUSTOMER_DAYS * DAY_MS) {
      add("new_customer", "Client depuis moins de 3 mois");
    }
    entry.ends.push(...[cancelDate ?? sub.current_period_end].filter((v): v is string => !!v));
  }

  const atRisk: AtRisk[] = [];
  for (const [customerId, entry] of byCustomerRisk) {
    const kinds = ORDER.filter((kind) => entry.reasons.has(kind));
    const score = Math.min(
      99,
      kinds.reduce(
        (total, kind) =>
          total +
          (kind === "failed_payment"
            ? failedPoints(failedByCustomer.get(customerId) ?? 1)
            : RISK_POINTS[kind]),
        0,
      ),
    );
    if (score < WATCH_SCORE) continue;
    const customer = names.get(customerId);
    atRisk.push({
      customerId,
      name: customer?.name || customer?.email || customerId,
      email: customer?.email ?? null,
      mrr: euros(entry.cents),
      score,
      level: score >= RETAIN_SCORE ? "retain" : "watch",
      reasons: kinds.map((kind) => ({ kind, label: entry.reasons.get(kind)! })),
      // La première échéance : c'est elle qui fixe le temps pour agir.
      periodEnd: [...entry.ends].sort()[0] ?? null,
    });
  }
  atRisk.sort((a, b) => b.score - a.score || b.mrr - a.mrr);

  const failedInvoices = failed
    .map((invoice) => ({
      id: invoice.id,
      customer:
        (invoice.customer_id &&
          (names.get(invoice.customer_id)?.name || names.get(invoice.customer_id)?.email)) ||
        "Client inconnu",
      amount: euros(invoice.amount_due_cents),
      attempts: invoice.attempt_count,
      nextAttempt: invoice.next_payment_attempt,
    }))
    .sort((a, b) => b.amount - a.amount);

  const nameOf = (customerId: string) => {
    const customer = names.get(customerId);
    return customer?.name || customer?.email || customerId;
  };

  // Essais qui se terminent dans les 7 jours : le bon moment pour aider à convertir.
  const trialsEnding = started
    .filter((sub) => {
      const trialEnd = time(sub.trial_end ?? null);
      return (
        sub.status === "trialing" &&
        !sub.ended_at &&
        trialEnd !== null &&
        trialEnd > end &&
        trialEnd <= end + 7 * DAY_MS
      );
    })
    .map((sub) => ({
      customerId: sub.customer_id,
      name: nameOf(sub.customer_id),
      email: names.get(sub.customer_id)?.email ?? null,
      mrr: euros(sub.mrr_cents),
      trialEnd: sub.trial_end!,
    }))
    .sort((a, b) => Date.parse(a.trialEnd) - Date.parse(b.trialEnd));

  // Offres qui perdent le plus de clients sur la période.
  const plans = new Map<string, { plan: string; customers: Set<string>; cents: number }>();
  for (const sub of ended) {
    const plan = sub.plan_name ?? "Sans nom";
    const entry = plans.get(plan) ?? { plan, customers: new Set<string>(), cents: 0 };
    entry.customers.add(sub.customer_id);
    entry.cents += sub.mrr_cents;
    plans.set(plan, entry);
  }
  const lostByPlan = [...plans.values()]
    .map((entry) => ({
      plan: entry.plan,
      customers: entry.customers.size,
      mrr: euros(entry.cents),
    }))
    .sort((a, b) => b.customers - a.customers || b.mrr - a.mrr);

  // Dépendance à un seul client : part du plus gros client dans le revenu actuel.
  const byCustomer = new Map<string, number>();
  for (const sub of current) {
    byCustomer.set(sub.customer_id, (byCustomer.get(sub.customer_id) ?? 0) + sub.mrr_cents);
  }
  const [topId, topCents] = [...byCustomer.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const totalCents = sum(current);
  const topCustomer =
    topId && totalCents > 0
      ? { name: nameOf(topId), mrr: euros(topCents!), share: percent(topCents!, totalCents) }
      : null;

  return {
    previous: summaryOf(previous),
    payingCustomers: byCustomer.size,
    customerMrr: Object.fromEntries([...byCustomer].map(([id, cents]) => [id, euros(cents)])),
    lostCustomerNames: lostCustomerIds.map(nameOf),
    trialsEnding,
    lostByPlan,
    topCustomer,
    mrr: euros(sum(current)),
    startMrr: euros(sum(atStart)),
    newMrr: euros(sum(created)),
    churnedMrr: euros(sum(ended)),
    activeSubscriptions: current.length,
    trialing: started.filter((sub) => sub.status === "trialing" && !sub.ended_at).length,
    customerChurn: percent(lostCustomers, customersAtStart.size),
    revenueChurn: percent(sum(endedFromStart), sum(atStart)),
    history,
    atRisk,
    mrrAtRisk: Math.round(atRisk.reduce((total, risk) => total + risk.mrr, 0) * 100) / 100,
    failedInvoices,
    failedAmount: Math.round(failedInvoices.reduce((t, i) => t + i.amount, 0) * 100) / 100,
  };
}
