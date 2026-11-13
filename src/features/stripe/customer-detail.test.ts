import { describe, expect, it } from "vitest";
import {
  customerTimeline,
  departureReasons,
  retentionHook,
  type DetailSubscription,
} from "./customer-detail";

const now = new Date("2026-11-16T12:00:00Z").getTime();
const daysAgo = (days: number) => new Date(now - days * 86_400_000).toISOString();
const sub = (id: string, extra: Partial<DetailSubscription> = {}): DetailSubscription => ({
  id,
  customer_id: `cus_${id}`,
  status: "canceled",
  mrr_cents: 4900,
  plan_name: "Pro",
  created_at: daysAgo(200),
  ended_at: daysAgo(5),
  cancel_at_period_end: false,
  current_period_end: null,
  ...extra,
});

describe("raisons de départ", () => {
  it("déclarées (portail Stripe) et observées (exclusives), avec un constat clair", () => {
    const gone = [
      sub("a", { cancel_reason: "payment_failed" }),
      sub("b", { cancel_reason: "payment_failed" }),
      sub("c", { cancel_reason: "cancellation_requested", cancel_feedback: "too_expensive" }),
      sub("d", {
        cancel_reason: "cancellation_requested",
        cancel_feedback: "unused",
        created_at: daysAgo(40),
      }),
      sub("e"),
    ];
    const result = departureReasons(gone, new Map());
    expect(result.total).toBe(5);
    expect(result.answered).toBe(2);
    expect(result.declared.map((reason) => reason.label)).toEqual([
      "Ne s'en sert plus",
      "Trop cher",
    ]);
    expect(result.observed[0]).toEqual({
      label: "Paiement échoué : départ involontaire",
      share: 40,
    });
    expect(result.observed.map((reason) => reason.label)).toContain(
      "Résiliation dans les 3 premiers mois",
    );
    expect(result.tip).toMatch(/paiement échoué/);
  });

  it("aucune réponse des clients : on dit comment activer la question", () => {
    const result = departureReasons(
      [sub("a", { cancel_reason: "cancellation_requested" })],
      new Map(),
    );
    expect(result.declared).toEqual([]);
    expect(result.tip).toMatch(/Portail client/);
  });

  it("aucun départ : rien à dire", () => {
    expect(departureReasons([], new Map())).toMatchObject({ total: 0, observed: [], tip: null });
  });
});

describe("chronologie d'un client", () => {
  it("faits Stripe du plus récent au plus ancien : essai, paiements, refus, résiliation", () => {
    const own = [
      sub("x", {
        status: "active",
        ended_at: null,
        created_at: daysAgo(60),
        trial_end: daysAgo(46),
        cancel_at_period_end: true,
        current_period_end: daysAgo(-10),
      }),
    ];
    const events = customerTimeline(
      own,
      [
        {
          subscription_id: "x",
          status: "paid",
          period_start: daysAgo(16),
          amount_paid_cents: 4900,
        },
      ],
      [{ customer_id: "cus_x", amount_due_cents: 4900, attempt_count: 2, created_at: daysAgo(2) }],
      now,
    );
    expect(events.map((event) => event.label)).toEqual([
      "Résiliation programmée pour le 26 novembre",
      "Paiement refusé : 49,00 € (2 tentatives)",
      "Paiement reçu : 49,00 €",
      "Essai converti en abonnement payant",
      "Essai Pro démarré",
    ]);
  });
});

describe("accroche de l'email de relance", () => {
  it("selon la première raison du risque, sans pression", () => {
    expect(retentionHook("cancel_scheduled", "Pro", "2026-11-26T00:00:00Z")).toMatch(
      /votre abonnement Pro doit s'arrêter le 26 novembre/,
    );
    expect(retentionHook("failed_payment", null, null)).toMatch(/n'a pas pu passer/);
    expect(retentionHook("card_expiring", "Pro", null)).toMatch(/carte bancaire/);
  });
});
