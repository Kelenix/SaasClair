import { describe, expect, it } from "vitest";
import { getAcquisitionData } from "./acquisition/data";
import { getChurnData } from "./churn/data";
import { draftEmail, FAILED_PAYMENTS, HIGH_RISK_SCORE, WATCHLIST } from "./customers";
import {
  AT_RISK,
  getFunnel,
  getHomeData,
  netRevenue,
  PERIOD_STATS,
  revenueBuckets,
} from "./demo-data";
import { timeSlots } from "./demo-utils";
import { PERIODS } from "./period";
import { getRevenueData } from "./revenue/data";
import { getTunnelData, stepRates, weakestCell } from "./tunnel/data";

const NOW = new Date("2026-10-30T09:00:00Z");

describe("découpage du temps", () => {
  it("affiche 12 mois calendaires distincts, le mois en cours en dernier", () => {
    const labels = timeSlots("12m", NOW).map((slot) => slot.label);
    expect(new Set(labels).size).toBe(12);
    expect(labels.at(-1)).toMatch(/^oct/);
  });
});

describe("écran Churn", () => {
  it("garde les 4 clients à risque de l'accueil et trie la liste par risque", () => {
    const { watchlist, summary } = getChurnData("30j", NOW);
    const high = watchlist.filter((customer) => customer.isHighRisk);
    expect(high.map((customer) => customer.id).sort()).toEqual(
      AT_RISK.map((customer) => customer.id).sort(),
    );
    expect(watchlist.map((customer) => customer.score)).toEqual(
      [...watchlist.map((customer) => customer.score)].sort((a, b) => b - a),
    );
    expect(summary).toMatch(/^4 clients risquent de partir\. Vous avez 12 jours/);
  });

  it("calcule la date de renouvellement depuis aujourd'hui", () => {
    const verso = getChurnData("30j", NOW).watchlist.find((customer) => customer.id === "verso-rh");
    expect(verso?.renewalDate).toBe("3 novembre");
  });

  it("affiche le churn de la période et un churn en revenu proche de 7 % sur 30 jours", () => {
    for (const period of PERIODS) {
      const kpis = getChurnData(period, NOW).kpis;
      expect(kpis[0].value).toBe(PERIOD_STATS[period].churn);
      expect(kpis[1].value).toBeGreaterThan(4);
      expect(kpis[1].value).toBeLessThan(10);
    }
    expect(getChurnData("30j", NOW).kpis[2].value).toBe(
      FAILED_PAYMENTS.reduce((sum, payment) => sum + payment.amount, 0),
    );
  });

  it("produit des cohortes en escalier, qui ne font que baisser", () => {
    const cohorts = getChurnData("30j", NOW).cohorts;
    cohorts.forEach((cohort, index) => {
      expect(cohort.retention).toHaveLength(cohorts.length - index);
      expect(cohort.retention[0]).toBe(100);
      cohort.retention.slice(1).forEach((value, month) => {
        expect(value).toBeLessThanOrEqual(cohort.retention[month]);
      });
    });
  });

  it("prépare un email de relance personnel, signé par l'utilisateur", () => {
    const email = draftEmail(WATCHLIST[0], "Nadia");
    expect(email.subject).toContain("Claire");
    expect(email.body).toMatch(/^Bonjour Claire,/);
    expect(email.body).toMatch(/Nadia$/);
    expect(WATCHLIST.every((customer) => customer.score >= 0 && customer.score <= 100)).toBe(true);
    expect(WATCHLIST.filter((customer) => customer.score >= HIGH_RISK_SCORE)).toHaveLength(4);
  });
});

describe("écran Acquisition", () => {
  it.each(PERIODS)("additionne les canaux sur %s", (period) => {
    const data = getAcquisitionData(period, NOW);
    const sum = (key: "visitors" | "signups" | "customers") =>
      data.channels.reduce((total, channel) => total + channel[key], 0);
    expect(data.kpis.map((kpi) => kpi.value).slice(0, 3)).toEqual([
      sum("visitors"),
      sum("signups"),
      sum("customers"),
    ]);
    expect(data.evolution).toHaveLength(timeSlots(period, NOW).length);
  });
});

describe("écran Tunnel", () => {
  it.each(PERIODS)("utilise le même taux essai → payant que l'accueil sur %s", (period) => {
    const funnel = getFunnel(period);
    const homeTrial = getHomeData(period, NOW).kpis.find((kpi) => kpi.id === "trial")!.value;
    expect(Math.abs(stepRates(funnel)[3] * 100 - homeTrial)).toBeLessThan(0.3);
  });

  it("met le mobile en évidence sur l'étape de paiement", () => {
    const { comparisons, funnel } = getTunnelData("30j");
    const device = comparisons.find((comparison) => comparison.id === "device")!;
    const worst = weakestCell(device.segments, stepRates(funnel));
    expect(device.segments[worst.segment].id).toBe("mobile");
    expect(worst.step).toBe(3);
  });
});

describe("écran Revenus", () => {
  it.each(PERIODS)("retombe sur 25 000 € en fin de période sur %s", (period) => {
    const data = getRevenueData(period, NOW);
    const net = data.flows.reduce((sum, flow) => sum + flow.amount, 0);
    expect(net).toBe(netRevenue(revenueBuckets(period, NOW)));
    expect(data.startMrr + net).toBe(25_000);
    expect(data.history.at(-1)?.mrr).toBe(25_000);
  });
});
