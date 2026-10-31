import { describe, expect, it } from "vitest";
import { computeRevenue, type SubscriptionRow } from "./metrics";

const now = new Date("2026-10-31T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const sub = (id: string, extra: Partial<SubscriptionRow>): SubscriptionRow => ({
  id,
  customer_id: `cus_${id}`,
  status: "active",
  mrr_cents: 7900,
  plan_name: "Pro",
  created_at: daysAgo(200),
  ended_at: null,
  cancel_at_period_end: false,
  current_period_end: daysAgo(-10),
  ...extra,
});

const subscriptions = [
  sub("a", {}),
  sub("b", { mrr_cents: 6320, status: "past_due", cancel_at_period_end: true }),
  sub("c", { mrr_cents: 2900, status: "canceled", ended_at: daysAgo(3) }),
  sub("d", { mrr_cents: 4900, created_at: daysAgo(5) }),
  sub("e", { status: "trialing", created_at: daysAgo(2) }),
  sub("f", { status: "incomplete_expired", mrr_cents: 9900 }),
];
const invoices = [
  {
    id: "in_1",
    customer_id: "cus_b",
    status: "open",
    amount_due_cents: 75_840,
    attempt_count: 2,
    next_payment_attempt: daysAgo(-2),
  },
  {
    id: "in_2",
    customer_id: "cus_a",
    status: "paid",
    amount_due_cents: 7900,
    attempt_count: 1,
    next_payment_attempt: null,
  },
];
const customers = [
  { id: "cus_a", name: "Alpha", email: "a@x.fr" },
  { id: "cus_b", name: "Beta", email: "b@x.fr" },
];

describe("computeRevenue", () => {
  const result = computeRevenue(subscriptions, invoices, customers, "30j", now);

  it("revenu récurrent actuel : actifs et en retard, sans essais ni abonnements jamais démarrés", () => {
    expect(result.mrr).toBe(79 + 63.2 + 49);
    expect(result.activeSubscriptions).toBe(3);
    expect(result.trialing).toBe(1);
  });

  it("mouvements de la période : nouveau, perdu, churn clients et revenu", () => {
    expect(result.startMrr).toBe(79 + 63.2 + 29);
    expect(result.newMrr).toBe(49);
    expect(result.churnedMrr).toBe(29);
    expect(result.customerChurn).toBe(33.3);
    expect(result.revenueChurn).toBe(16.9);
  });

  it("clients à risque : résiliation programmée, retard et paiement échoué réunis", () => {
    expect(result.atRisk).toHaveLength(1);
    const [beta] = result.atRisk;
    expect(beta).toMatchObject({ name: "Beta", mrr: 63.2, score: 99 });
    expect(beta.reasons.map((reason) => reason.kind)).toEqual([
      "cancel_scheduled",
      "past_due",
      "failed_payment",
    ]);
    expect(result.mrrAtRisk).toBe(63.2);
  });

  it("paiements échoués : factures ouvertes après une tentative", () => {
    expect(result.failedInvoices).toEqual([
      { id: "in_1", customer: "Beta", amount: 758.4, attempts: 2, nextAttempt: daysAgo(-2) },
    ]);
    expect(result.failedAmount).toBe(758.4);
  });

  it("historique sur 12 mois, sans rien inventer pour un compte vide", () => {
    expect(result.history).toHaveLength(12);
    expect(result.history.at(-1)?.mrr).toBe(result.mrr);
    const empty = computeRevenue([], [], [], "30j", now);
    expect(empty).toMatchObject({ mrr: 0, customerChurn: 0, atRisk: [], failedInvoices: [] });
  });
});
