import { describe, expect, it } from "vitest";
import type { RealAcquisition } from "@/features/collect/aggregate";
import type { SiteAudit } from "@/features/setup/site-analysis";
import type { RealRevenue } from "@/features/stripe/metrics";
import { buildInsights, listNames, weekKey } from "./engine";

const now = new Date("2026-11-13T12:00:00Z");

const revenue = (overrides: Partial<RealRevenue> = {}): RealRevenue => ({
  mrr: 2000,
  startMrr: 2000,
  newMrr: 0,
  churnedMrr: 0,
  activeSubscriptions: 10,
  trialing: 0,
  customerChurn: 0,
  revenueChurn: 0,
  history: [],
  atRisk: [],
  mrrAtRisk: 0,
  failedInvoices: [],
  failedAmount: 0,
  previous: {
    customerChurn: 0,
    revenueChurn: 0,
    newMrr: 0,
    churnedMrr: 0,
    customersAtStart: 10,
    lostCustomers: 0,
  },
  payingCustomers: 10,
  lostCustomerNames: [],
  trialsEnding: [],
  lostByPlan: [],
  topCustomer: { name: "Alpha", mrr: 200, share: 10 },
  customerMrr: {},
  ...overrides,
});

const goodAudit: SiteAudit = {
  reachable: true,
  responseMs: 300,
  speed: "rapide",
  pageCount: 12,
  pages: { signup: "https://x.fr/essai", pricing: "https://x.fr/tarifs", checkout: null },
  seo: {
    score: 100,
    title: "X",
    checks: [
      { label: "Titre de page", ok: true },
      { label: "Description", ok: true },
      { label: "Adapté au mobile", ok: true },
      { label: "Connexion sécurisée", ok: true },
    ],
  },
  technologies: [],
};

const facts = (extra: Partial<Parameters<typeof buildInsights>[0]> = {}) => ({
  now,
  siteUrl: "https://x.fr",
  audit: null,
  revenue: null,
  visits: null,
  ...extra,
});

describe("outils", () => {
  it("semaine ISO", () => {
    expect(weekKey(now)).toBe("2026-46");
    expect(weekKey(new Date("2027-01-01T12:00:00Z"))).toBe("2026-53");
  });

  it("liste de noms lisible", () => {
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B"])).toBe("A et B");
    expect(listNames(["A", "B", "C"])).toBe("A, B et C");
    expect(listNames(["A", "B", "C", "D", "E"])).toBe("A, B et 3 autres");
  });
});

describe("buildInsights", () => {
  it("rien d'inventé : aucune donnée, aucun insight", () => {
    expect(buildInsights(facts())).toEqual([]);
    expect(buildInsights(facts({ audit: goodAudit, revenue: revenue() }))).toEqual([]);
  });

  it("paiements échoués : montant, clients et action, en premier", () => {
    const insights = buildInsights(
      facts({
        audit: { ...goodAudit, pages: { ...goodAudit.pages, pricing: null } },
        revenue: revenue({
          failedAmount: 450,
          failedInvoices: [
            { id: "in_1", customer: "Lumen", amount: 300, attempts: 2, nextAttempt: null },
            { id: "in_2", customer: "Verso", amount: 150, attempts: 1, nextAttempt: null },
          ],
        }),
      }),
    );
    expect(insights.map((insight) => insight.id)).toEqual(["paiements-2026-46", "site-tarifs"]);
    expect(insights[0].title).toContain("450");
    expect(insights[0].finding).toContain("Lumen et Verso");
    expect(insights[0].impactEuros).toBe(450);
  });

  it("départs programmés : revenu en jeu et premier départ daté", () => {
    const [insight] = buildInsights(
      facts({
        revenue: revenue({
          atRisk: [
            {
              customerId: "c1",
              name: "Cobalt",
              email: null,
              mrr: 120,
              score: 90,
              level: "retain",
              reasons: [{ kind: "cancel_scheduled", label: "" }],
              periodEnd: "2026-11-20T00:00:00Z",
            },
            {
              customerId: "c2",
              name: "Orbe",
              email: null,
              mrr: 80,
              score: 60,
              level: "retain",
              reasons: [{ kind: "failed_payment", label: "" }],
              periodEnd: null,
            },
          ],
        }),
      }),
    );
    expect(insight.id).toBe("departs-2026-46");
    expect(insight.title).toBe("1 client a programmé son départ.");
    expect(insight.action).toContain("Cobalt avant le 20 novembre");
    expect(insight.impactEuros).toBe(120);
  });

  it("cartes qui expirent avant le prochain paiement", () => {
    const [insight] = buildInsights(
      facts({
        revenue: revenue({
          atRisk: [
            {
              customerId: "c",
              name: "Nova",
              email: null,
              mrr: 49,
              score: 45,
              level: "watch",
              reasons: [{ kind: "card_expiring", label: "" }],
              periodEnd: "2026-12-01T00:00:00Z",
            },
          ],
        }),
      }),
    );
    expect(insight.id).toBe("cartes-2026-46");
    expect(insight.title).toBe("1 carte bancaire expire avant le prochain paiement.");
    expect(insight.impactEuros).toBe(49);
  });

  it("churn en hausse seulement s'il monte vraiment, avec l'offre en cause", () => {
    const rising = revenue({
      customerChurn: 6,
      churnedMrr: 300,
      lostCustomerNames: ["A", "B", "C"],
      lostByPlan: [{ plan: "Starter", customers: 2, mrr: 200 }],
      previous: { ...revenue().previous, customerChurn: 2 },
    });
    const [insight] = buildInsights(facts({ revenue: rising }));
    expect(insight.id).toBe("churn-hausse-2026-46");
    expect(insight.cause).toContain("offre Starter");

    const stable = { ...rising, previous: { ...rising.previous, customerChurn: 5.5 } };
    expect(buildInsights(facts({ revenue: stable }))).toEqual([]);
  });

  it("essais qui finissent et dépendance à un gros client", () => {
    const insights = buildInsights(
      facts({
        revenue: revenue({
          trialsEnding: [
            {
              customerId: "t",
              name: "Nova",
              email: null,
              mrr: 49,
              trialEnd: "2026-11-15T00:00:00Z",
            },
          ],
          topCustomer: { name: "Géant", mrr: 900, share: 45 },
        }),
      }),
    );
    expect(insights.map((insight) => insight.id)).toEqual(["essais-2026-46", "dependance-client"]);
    expect(insights[0].finding).toContain("15 novembre");
  });

  it("site : seulement les vrais problèmes, et rien si le site n'a pas répondu", () => {
    const slow: SiteAudit = {
      ...goodAudit,
      speed: "lent",
      responseMs: 2400,
      seo: {
        ...goodAudit.seo,
        checks: goodAudit.seo.checks.map((check) => ({
          ...check,
          ok: check.label !== "Description",
        })),
      },
    };
    expect(buildInsights(facts({ audit: slow })).map((insight) => insight.id)).toEqual([
      "site-vitesse",
      "site-description",
    ]);
    expect(buildInsights(facts({ audit: { ...slow, reachable: false } }))).toEqual([]);
  });

  it("visites : alerte si un seul canal amène presque tout", () => {
    const visits = {
      visitors: 500,
      channels: [{ id: "seo", name: "Recherche Google", visitors: 400, share: 80 }],
    } as RealAcquisition;
    expect(buildInsights(facts({ visits }))[0].id).toBe("canal-dependance");
    expect(buildInsights(facts({ visits: { ...visits, visitors: 50 } }))).toEqual([]);
  });
});
