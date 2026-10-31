import { describe, expect, it } from "vitest";
import { answerQuestion } from "./answers";
import { AT_RISK, getHomeData, NADIA_MRR, netRevenue, weakestFunnelStep } from "./demo-data";
import { PERIODS, parsePeriod, periodFromRange } from "./period";

const NOW = new Date("2026-10-30T09:00:00Z");

describe("données de démonstration de Nadia", () => {
  it.each(PERIODS)("restent cohérentes sur %s", (period) => {
    const data = getHomeData(period, NOW);
    const kpi = (id: string) => data.kpis.find((item) => item.id === id)!;

    expect(kpi("mrr").value).toBe(NADIA_MRR);
    expect(kpi("at-risk").value).toBe(AT_RISK.reduce((sum, customer) => sum + customer.mrr, 0));
    expect(data.channels.reduce((sum, channel) => sum + channel.revenue, 0)).toBe(NADIA_MRR);
    // Les canaux sont classés par revenu et le tunnel ne fait que se rétrécir.
    expect(data.channels.map((channel) => channel.revenue)).toEqual(
      [...data.channels.map((channel) => channel.revenue)].sort((a, b) => b - a),
    );
    data.funnel
      .slice(1)
      .forEach((step, index) => expect(step.count).toBeLessThan(data.funnel[index].count));
    expect(data.insights).toHaveLength(3);
  });

  it("a 7 % de churn sur 30 jours et 1 750 € de revenu à risque", () => {
    const data = getHomeData("30j", NOW);
    expect(data.kpis.map((kpi) => kpi.value)).toEqual([25000, 7, 1750, 18.4]);
    expect(data.summary).toBe(
      "Bonne semaine : votre churn baisse, mais 4 clients sont à surveiller.",
    );
  });

  it.each(PERIODS)(
    "affiche sur %s une croissance qui concorde avec le graphique des revenus",
    (period) => {
      const data = getHomeData(period, NOW);
      const net = netRevenue(data.revenue);
      const shown = Number(data.kpis[0].delta.replace(/[^\d,]/g, "").replace(",", "."));
      const expected = (net / (NADIA_MRR - net)) * 100;
      expect(Math.abs(shown - expected)).toBeLessThan(0.6);
    },
  );

  it("garde environ +4 % de revenu sur 30 jours, comme le site vitrine", () => {
    expect(getHomeData("30j", NOW).kpis[0].delta).toMatch(/^\+[34],\d\s%$/);
  });

  it("est identique d'un appel à l'autre (pas d'écart serveur / navigateur)", () => {
    expect(getHomeData("90j", NOW)).toEqual(getHomeData("90j", NOW));
  });

  it("met en évidence le paiement, l'étape la plus sous son taux habituel", () => {
    const { funnel } = getHomeData("30j", NOW);
    expect(funnel[weakestFunnelStep(funnel)].id).toBe("payment");
  });
});

describe("période", () => {
  it("lit l'URL et revient à 30 jours par défaut", () => {
    expect(parsePeriod("12m")).toBe("12m");
    expect(parsePeriod("n'importe quoi")).toBe("30j");
    expect(parsePeriod(undefined)).toBe("30j");
  });

  it("ramène une période personnalisée à la plus proche", () => {
    expect(periodFromRange("2026-10-01", "2026-10-29")).toBe("30j");
    expect(periodFromRange("2026-01-01", "2026-10-29")).toBe("12m");
  });
});

describe("barre de question", () => {
  it("répond par un insight rédigé", () => {
    expect(answerQuestion("Pourquoi mes inscriptions ont baissé ?").title).toMatch(
      /inscriptions ont baissé/,
    );
    expect(answerQuestion("Qui va partir ?").title).toMatch(/churn/);
    expect(answerQuestion("Quelle météo demain ?").title).toMatch(/pas encore de réponse/);
  });
});
