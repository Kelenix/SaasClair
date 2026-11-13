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

export type RiskReason = "cancel_scheduled" | "unpaid" | "past_due" | "failed_payment";
export type AtRisk = {
  customerId: string;
  name: string;
  email: string | null;
  mrr: number;
  score: number;
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

const RISK: Record<RiskReason, number> = {
  cancel_scheduled: 90,
  unpaid: 85,
  past_due: 75,
  failed_payment: 60,
};

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
  const atStart = started.filter((sub) => payingAt(sub, start));
  // Nouveau revenu : abonnements devenus payants pendant la période (essais convertis compris).
  const created = started.filter((sub) => {
    const t = paidFrom(sub);
    return everPaid(sub) && t > start && t <= end;
  });
  // Revenu perdu : abonnements payants arrêtés pendant la période (un essai annulé n'en est pas).
  const ended = started.filter((sub) => everPaid(sub) && endedWithin(sub, start, end));
  const endedFromStart = atStart.filter((sub) => endedWithin(sub, start, end));
  const sum = (subs: SubscriptionRow[]) => subs.reduce((total, sub) => total + sub.mrr_cents, 0);

  // Churn clients : un client qui change d'offre (résiliation puis nouvel abonnement) reste.
  const customersAtStart = new Set(atStart.map((sub) => sub.customer_id));
  const stillThere = new Set(
    started
      .filter((sub) => sub.status !== "trialing" || time(sub.ended_at) === null)
      .filter((sub) => {
        const t = time(sub.ended_at);
        return t === null || t > end;
      })
      .map((sub) => sub.customer_id),
  );
  const lostCustomers = [...customersAtStart].filter((id) => !stillThere.has(id)).length;

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

  // Clients à risque : résiliation programmée, impayé, retard ou paiement échoué.
  const risks = new Map<string, AtRisk>();
  for (const sub of current.concat(started.filter((s) => s.status === "unpaid"))) {
    const reasons: AtRisk["reasons"] = [];
    const cancelAt = time(sub.cancel_at ?? null);
    const cancelDate = sub.cancel_at_period_end
      ? sub.current_period_end
      : cancelAt !== null && cancelAt > end
        ? sub.cancel_at!
        : null;
    if (cancelDate !== null || sub.cancel_at_period_end) {
      const date = cancelDate
        ? new Date(cancelDate).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
          })
        : null;
      reasons.push({
        kind: "cancel_scheduled",
        label: date ? `Résiliation programmée le ${date}` : "Résiliation programmée",
      });
    }
    if (sub.status === "unpaid") reasons.push({ kind: "unpaid", label: "Abonnement impayé" });
    if (sub.status === "past_due") reasons.push({ kind: "past_due", label: "Paiement en retard" });
    const failedCount = failedByCustomer.get(sub.customer_id) ?? 0;
    if (failedCount) {
      reasons.push({
        kind: "failed_payment",
        label: `${failedCount} paiement${failedCount > 1 ? "s" : ""} échoué${failedCount > 1 ? "s" : ""}`,
      });
    }
    if (!reasons.length) continue;
    const customer = names.get(sub.customer_id);
    const existing = risks.get(sub.customer_id);
    // Plusieurs abonnements du même client : chaque raison n'apparaît qu'une fois.
    const merged = existing
      ? existing.reasons.concat(
          reasons.filter((r) => !existing.reasons.some((e) => e.kind === r.kind)),
        )
      : reasons;
    const score = Math.min(
      99,
      Math.max(...merged.map((r) => RISK[r.kind])) + (merged.length - 1) * 5,
    );
    const ends = [existing?.periodEnd ?? null, cancelDate ?? sub.current_period_end]
      .filter((value): value is string => Boolean(value))
      .sort();
    risks.set(sub.customer_id, {
      customerId: sub.customer_id,
      name: customer?.name || customer?.email || sub.customer_id,
      email: customer?.email ?? null,
      mrr: Math.round((euros(sub.mrr_cents) + (existing?.mrr ?? 0)) * 100) / 100,
      score,
      reasons: merged,
      // La première échéance : c'est elle qui fixe le temps pour agir.
      periodEnd: ends[0] ?? null,
    });
  }
  const atRisk = [...risks.values()].sort((a, b) => b.score - a.score || b.mrr - a.mrr);

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

  return {
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
