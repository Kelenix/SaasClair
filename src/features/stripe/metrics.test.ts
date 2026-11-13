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

  it("un essai annulé n'est ni du nouveau revenu, ni un départ", () => {
    const trials = [
      sub("p", {}),
      sub("t", {
        status: "canceled",
        created_at: daysAgo(10),
        trial_end: daysAgo(3),
        ended_at: daysAgo(3),
      }),
    ];
    const r = computeRevenue(trials, [], [], "30j", now);
    expect(r.newMrr).toBe(0);
    expect(r.churnedMrr).toBe(0);
    expect(r.customerChurn).toBe(0);
  });

  it("un essai converti compte en nouveau revenu à la fin de l'essai", () => {
    const converted = sub("c", { created_at: daysAgo(35), trial_end: daysAgo(21) });
    const r = computeRevenue([converted], [], [], "30j", now);
    expect(r.startMrr).toBe(0);
    expect(r.newMrr).toBe(79);
  });

  it("le churn ne compte que les clients payants au début : jamais plus de 100 %", () => {
    const subs = [
      sub("a", {}),
      sub("b", { status: "canceled", ended_at: daysAgo(5) }),
      ...["x", "y", "z"].map((id) =>
        sub(id, { status: "canceled", created_at: daysAgo(20), ended_at: daysAgo(2) }),
      ),
    ];
    const r = computeRevenue(subs, [], [], "30j", now);
    expect(r.customerChurn).toBe(50);
    expect(r.revenueChurn).toBe(50);
  });

  it("un changement d'offre (résiliation puis nouvel abonnement) n'est pas un départ", () => {
    const subs = [
      sub("old", { customer_id: "cus_n", status: "canceled", ended_at: daysAgo(4) }),
      sub("new", { customer_id: "cus_n", created_at: daysAgo(4) }),
    ];
    expect(computeRevenue(subs, [], [], "30j", now).customerChurn).toBe(0);
  });

  it("raisons sans doublon pour un client à plusieurs abonnements", () => {
    const subs = [
      sub("m1", { customer_id: "cus_m", status: "past_due" }),
      sub("m2", { customer_id: "cus_m", status: "past_due" }),
    ];
    const failed = [{ ...invoices[0], customer_id: "cus_m" }];
    const [risk] = computeRevenue(subs, failed, [], "30j", now).atRisk;
    expect(risk.reasons.map((r) => r.kind)).toEqual(["past_due", "failed_payment"]);
    expect(risk.mrr).toBe(158);
  });

  it("résiliation programmée à une date précise : client à risque", () => {
    const subs = [sub("k", { cancel_at: daysAgo(-12) })];
    const [risk] = computeRevenue(subs, [], [], "30j", now).atRisk;
    expect(risk.reasons[0].kind).toBe("cancel_scheduled");
    expect(risk.periodEnd).toBe(daysAgo(-12));
  });

  it("le dernier point du graphique est le revenu affiché, impayés exclus", () => {
    const subs = [sub("a", {}), sub("u", { status: "unpaid", mrr_cents: 5000 })];
    const r = computeRevenue(subs, [], [], "30j", now);
    expect(r.history.at(-1)?.mrr).toBe(r.mrr);
  });

  it("score explicable : carte qui expire, renouvellement annuel, client récent", () => {
    const subs = [
      // Carte qui expire avant le renouvellement annuel dans 20 jours : 35 + 10 = à surveiller.
      sub("card", {
        billing_interval: "year",
        current_period_end: daysAgo(-20),
        card_expires_at: daysAgo(-5),
      }),
      // Client récent seul : 10 points, pas dans la liste.
      sub("new", { created_at: daysAgo(20) }),
      // Paiement échoué + client récent : 40 + 10.
      sub("fail", { created_at: daysAgo(20) }),
      // Résiliation programmée : on ne parle plus de carte (il part de toute façon).
      sub("leave", { cancel_at_period_end: true, card_expires_at: daysAgo(-5) }),
    ];
    const failed = [{ ...invoices[0], customer_id: "cus_fail" }];
    const r = computeRevenue(subs, failed, [], "30j", now);
    const byId = Object.fromEntries(r.atRisk.map((risk) => [risk.customerId, risk]));
    expect(Object.keys(byId).sort()).toEqual(["cus_card", "cus_fail", "cus_leave"]);
    expect(byId.cus_card).toMatchObject({ score: 45, level: "watch" });
    expect(byId.cus_card.reasons.map((reason) => reason.kind)).toEqual([
      "card_expiring",
      "annual_renewal",
    ]);
    expect(byId.cus_fail).toMatchObject({ score: 50, level: "watch" });
    expect(byId.cus_leave.reasons.map((reason) => reason.kind)).toEqual(["cancel_scheduled"]);
    expect(byId.cus_leave.level).toBe("retain");
  });

  it("de quoi rédiger les insights : période précédente, essais, offres, gros client", () => {
    const subs = [
      sub("big", { mrr_cents: 50_000 }),
      sub("s1", { mrr_cents: 10_000 }),
      sub("s2", { mrr_cents: 10_000 }),
      sub("gone1", { plan_name: "Starter", status: "canceled", ended_at: daysAgo(5) }),
      sub("gone2", { plan_name: "Starter", status: "canceled", ended_at: daysAgo(8) }),
      sub("old", { status: "canceled", ended_at: daysAgo(40) }),
      sub("trial", { status: "trialing", created_at: daysAgo(4), trial_end: daysAgo(-3) }),
      sub("later", { status: "trialing", created_at: daysAgo(1), trial_end: daysAgo(-13) }),
    ];
    const names = [{ id: "cus_big", name: "Géant", email: null }];
    const r = computeRevenue(subs, [], names, "30j", now);
    expect(r.lostCustomerNames).toEqual(["cus_gone1", "cus_gone2"]);
    expect(r.lostByPlan[0]).toEqual({ plan: "Starter", customers: 2, mrr: 158 });
    expect(r.previous.lostCustomers).toBe(1);
    expect(r.trialsEnding.map((t) => t.customerId)).toEqual(["cus_trial"]);
    expect(r.topCustomer).toEqual({ name: "Géant", mrr: 500, share: 71.4 });
    expect(r.payingCustomers).toBe(3);
  });

  it("historique sur 12 mois, sans rien inventer pour un compte vide", () => {
    expect(result.history).toHaveLength(12);
    expect(result.history.at(-1)?.mrr).toBe(result.mrr);
    const empty = computeRevenue([], [], [], "30j", now);
    expect(empty).toMatchObject({ mrr: 0, customerChurn: 0, atRisk: [], failedInvoices: [] });
  });
});
