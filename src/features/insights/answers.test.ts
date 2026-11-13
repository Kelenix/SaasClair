import { describe, expect, it } from "vitest";
import type { RealAcquisition } from "@/features/collect/aggregate";
import type { RealRevenue } from "@/features/stripe/metrics";
import { answerFromFacts } from "./answers";
import { buildInsights, type InsightFacts } from "./engine";

const revenue = {
  mrr: 2500,
  newMrr: 300,
  churnedMrr: 175,
  activeSubscriptions: 30,
  trialing: 2,
  customerChurn: 7,
  failedAmount: 120,
  failedInvoices: [{ id: "in_1", customer: "Verso", amount: 120, attempts: 1, nextAttempt: null }],
  atRisk: [
    {
      customerId: "c",
      name: "Lumen",
      email: null,
      mrr: 99,
      score: 90,
      reasons: [{ kind: "cancel_scheduled", label: "" }],
      periodEnd: "2026-11-20T00:00:00Z",
    },
  ],
  mrrAtRisk: 99,
  previous: { customerChurn: 8, customersAtStart: 30 },
  lostCustomerNames: ["Orbe", "Cobalt"],
  trialsEnding: [],
  lostByPlan: [],
  topCustomer: null,
} as unknown as RealRevenue;

const visits = {
  visitors: 400,
  channels: [
    { id: "seo", name: "Recherche Google", visitors: 240, share: 60 },
    { id: "direct", name: "Accès direct", visitors: 160, share: 40 },
  ],
} as RealAcquisition;

const base: InsightFacts = {
  now: new Date("2026-11-13T12:00:00Z"),
  siteUrl: null,
  audit: null,
  revenue: null,
  visits: null,
};
const ask = (question: string, facts: InsightFacts) =>
  answerFromFacts(question, facts, buildInsights(facts));

describe("answerFromFacts", () => {
  it("churn : chiffre, tendance, clients à surveiller et action", () => {
    const answer = ask("Qui risque de partir ce mois-ci ?", { ...base, revenue });
    expect(answer.title).toContain("7,0");
    expect(answer.title).toContain("en baisse");
    expect(answer.paragraphs.join(" ")).toContain("Lumen");
    expect(answer.paragraphs.join(" ")).toContain("Orbe et Cobalt");
    expect(answer.paragraphs.at(-1)).toMatch(/^À faire : Appelez Lumen/);
  });

  it("revenu et paiements à récupérer", () => {
    const answer = ask("Combien je gagne ?", { ...base, revenue });
    expect(answer.title).toContain("2");
    expect(answer.paragraphs.join(" ")).toContain("paiements échoués");
  });

  it("canaux à partir des visites", () => {
    const answer = ask("Quel canal me rapporte le plus ?", { ...base, visits });
    expect(answer.title).toContain("Recherche Google");
    expect(answer.paragraphs[0]).toContain("Accès direct");
  });

  it("sans la source nécessaire, dit ce qui manque au lieu d'inventer", () => {
    expect(ask("Qui va partir ?", base).title).toBe("Pour répondre, il me faut vos paiements.");
    expect(ask("D'où viennent mes visiteurs ?", base).title).toBe(
      "Pour répondre, il me faut vos visites.",
    );
  });

  it("question hors sujet : la priorité du moment, sinon une aide", () => {
    expect(ask("Bonjour", { ...base, revenue }).title).toContain("paiements échoués");
    expect(ask("Bonjour", base).title).toBe("Je n'ai pas de réponse précise à cette question.");
  });
});
