import { describe, expect, it } from "vitest";
import type { RealRevenue } from "@/features/stripe/metrics";
import { composeAlert, detectAlerts, isDigestTime, type AlertFacts } from "./detect";

// Mardi 17 novembre 2026, 10 h à Paris.
const now = new Date("2026-11-17T09:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

const revenue = {
  mrr: 25_000,
  customerChurn: 7,
  mrrAtRisk: 420,
  atRisk: [
    {
      customerId: "cus_lumen",
      name: "Lumen Bureau",
      email: null,
      mrr: 420,
      score: 90,
      level: "retain",
      reasons: [{ kind: "cancel_scheduled", label: "Résiliation programmée le 26 novembre" }],
      periodEnd: "2026-11-26T00:00:00Z",
      plan: "Pro",
      since: null,
      timeline: [],
      hook: "",
    },
    {
      customerId: "cus_watch",
      name: "Veille SA",
      email: null,
      mrr: 90,
      score: 45,
      level: "watch",
      reasons: [{ kind: "card_expiring", label: "Carte qui expire" }],
      periodEnd: null,
      plan: null,
      since: null,
      timeline: [],
      hook: "",
    },
  ],
  failedInvoices: [
    { id: "in_1", customer: "Verso RH", amount: 450, attempts: 2, nextAttempt: null },
  ],
} as unknown as RealRevenue;

const facts = (overrides: Partial<AlertFacts> = {}): AlertFacts => ({
  now,
  revenue,
  lastVisitAt: hoursAgo(1),
  visitors7d: 1200,
  traffic: { last: 180, previous: 200 },
  conversion: null,
  insights: [],
  ...overrides,
});

const ids = (f: AlertFacts) => detectAlerts(f).map((event) => event.alertId);

describe("detectAlerts", () => {
  it("client à retenir (pas « à surveiller ») et paiement refusé, chacun avec sa clé", () => {
    const events = detectAlerts(facts());
    expect(events.map((event) => [event.alertId, event.key])).toEqual([
      ["churn-risk", "cus_lumen:2026-11"],
      ["failed-payment", "in_1"],
    ]);
    expect(events[0].href).toBe("/app/churn?client=cus_lumen");
  });

  it("script silencieux : 6 heures sans visite, seulement pour un site qui en reçoit", () => {
    expect(ids(facts({ lastVisitAt: hoursAgo(7) }))).toContain("script-silent");
    expect(ids(facts({ lastVisitAt: hoursAgo(7), visitors7d: 50 }))).not.toContain("script-silent");
    expect(ids(facts({ lastVisitAt: hoursAgo(5) }))).not.toContain("script-silent");
  });

  it("chute des visites : plus de 30 % en 24 heures, à partir de 50 visiteurs", () => {
    expect(ids(facts({ traffic: { last: 120, previous: 200 } }))).toContain("traffic-drop");
    expect(ids(facts({ traffic: { last: 150, previous: 200 } }))).not.toContain("traffic-drop");
    expect(ids(facts({ traffic: { last: 10, previous: 40 } }))).not.toContain("traffic-drop");
  });

  it("baisse de conversion : plus de 15 % sur 7 jours, avec assez de visiteurs", () => {
    const conversion = (reached: number) => ({
      step: "Inscrits",
      current: { visitors: 500, reached },
      previous: { visitors: 500, reached: 50 },
    });
    expect(ids(facts({ conversion: conversion(40) }))).toContain("conversion-drop");
    expect(ids(facts({ conversion: conversion(45) }))).not.toContain("conversion-drop");
  });

  it("résumé : le lundi à partir de 8 heures (heure de Paris), pas avant", () => {
    expect(isDigestTime(new Date("2026-11-16T07:30:00Z"))).toBe(true); // 8 h 30 à Paris
    expect(isDigestTime(new Date("2026-11-16T06:30:00Z"))).toBe(false); // 7 h 30
    expect(isDigestTime(now)).toBe(false); // mardi
    const monday = detectAlerts(facts({ now: new Date("2026-11-16T08:00:00Z") }));
    const digest = monday.find((event) => event.alertId === "weekly-digest")!;
    expect(digest.line).toMatch(/Revenu mensuel récurrent/);
  });
});

describe("composeAlert", () => {
  it("un message par type : le nom quand il est seul, le nombre sinon", () => {
    const [risk] = detectAlerts(facts());
    expect(composeAlert("churn-risk", [risk]).subject).toBe("Lumen Bureau risque de partir");
    expect(composeAlert("churn-risk", [risk, { ...risk, key: "x" }]).subject).toBe(
      "2 clients risquent de partir",
    );
  });
});
