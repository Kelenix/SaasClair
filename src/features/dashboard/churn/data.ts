// Écran « Churn et rétention » : indicateurs, clients à surveiller, cohortes et raisons de départ.

import { formatEuro } from "@/lib/format";
import { FAILED_PAYMENTS, HIGH_RISK_SCORE, WATCHLIST, type WatchedCustomer } from "../customers";
import { PERIOD_STATS, revenueBuckets, type Kpi } from "../demo-data";
import { dateIn, NADIA_MRR, scale, seeded, trend } from "../demo-utils";
import { PERIOD_DAYS, type Period } from "../period";

export type WatchedRow = WatchedCustomer & { renewalDate: string; isHighRisk: boolean };
export type Cohort = {
  label: string;
  size: number;
  /** % de clients encore là, mois par mois. */ retention: number[];
};
export type Reason = { label: string; share: number };

export type ChurnData = {
  summary: string;
  kpis: Kpi[];
  watchlist: WatchedRow[];
  cohorts: Cohort[];
  reasons: {
    declared: Reason[];
    declaredBasis: string;
    observed: Reason[];
    observedBasis: string;
  };
};

const COHORT_COUNT = 8;
const COHORT_MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

/** Cohortes mensuelles : les plus récentes partent moins vite, signe que le churn baisse. */
function cohorts(now: Date): Cohort[] {
  const random = seeded("cohortes");
  return Array.from({ length: COHORT_COUNT }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (COHORT_COUNT - 1) + index, 1);
    const monthlyChurn = 0.095 - index * 0.004;
    const retention = [100];
    let kept = 100;
    for (let month = 1; month < COHORT_COUNT - index; month++) {
      // Le premier mois est le plus risqué : c'est là que l'on décide de rester.
      kept *= 1 - monthlyChurn * (month === 1 ? 1.6 : 1) * (0.85 + random() * 0.3);
      retention.push(Math.round(kept));
    }
    return {
      label: COHORT_MONTH.format(start),
      size: 62 + Math.round(random() * 22),
      retention,
    };
  });
}

const DECLARED: Reason[] = [
  { label: "Trop cher pour l'usage", share: 31 },
  { label: "Il manque une fonctionnalité", share: 24 },
  { label: "Pas le temps de l'utiliser", share: 21 },
  { label: "Passe chez un concurrent", share: 14 },
  { label: "Autre raison", share: 10 },
];

const OBSERVED: Reason[] = [
  { label: "Moins d'une connexion par semaine", share: 46 },
  { label: "Paiement échoué non récupéré", share: 22 },
  { label: "Un seul utilisateur actif", share: 18 },
  { label: "Offre réduite juste avant", share: 14 },
];

export function getChurnData(period: Period, now = new Date()): ChurnData {
  const random = seeded(`churn-${period}`);
  const stats = PERIOD_STATS[period];
  const lost = revenueBuckets(period, now).reduce((sum, bucket) => sum + bucket.lost, 0);
  const revenueChurn = Math.round(((lost * 30) / PERIOD_DAYS[period] / NADIA_MRR) * 1000) / 10;
  const failed = FAILED_PAYMENTS.reduce((sum, payment) => sum + payment.amount, 0);
  const saved = scale(1180, period);
  const retained = Math.max(1, scale(7, period));

  const watchlist = WATCHLIST.map((customer) => ({
    ...customer,
    renewalDate: dateIn(now, customer.renewsInDays),
    isHighRisk: customer.score >= HIGH_RISK_SCORE,
  })).sort((a, b) => b.score - a.score);
  const highRisk = watchlist.filter((customer) => customer.isHighRisk);
  const firstRenewal = [...highRisk].sort((a, b) => a.renewsInDays - b.renewsInDays)[0];
  const lastRenewal = Math.max(...highRisk.map((customer) => customer.renewsInDays));

  return {
    summary: firstRenewal
      ? `${highRisk.length} clients risquent de partir. Vous avez ${lastRenewal} jours pour les retenir, en commençant par ${firstRenewal.name}.`
      : "Aucun client ne risque de partir en ce moment.",
    kpis: [
      {
        id: "customer-churn",
        label: "Churn clients",
        value: stats.churn,
        format: "percent",
        delta: stats.churnDelta,
        isGood: true,
        trend: trend(stats.churn + 1.2, stats.churn, 12, random, 0.04),
      },
      {
        id: "revenue-churn",
        label: "Churn en revenu",
        value: revenueChurn,
        format: "percent",
        delta: `${formatEuro(lost)} sur la période`,
        isGood: null,
        trend: trend(revenueChurn + 0.9, revenueChurn, 12, random, 0.05),
      },
      {
        id: "involuntary",
        label: "Churn involontaire",
        value: failed,
        format: "euro",
        delta: `${FAILED_PAYMENTS.length} paiements à récupérer`,
        isGood: false,
        trend: trend(failed * 0.7, failed, 12, random, 0.1),
      },
      {
        id: "saved",
        label: "Revenu sauvé",
        value: saved,
        format: "euro",
        delta: `${retained} clients retenus`,
        isGood: true,
        trend: trend(saved * 0.4, saved, 12, random, 0.08),
      },
    ],
    watchlist,
    cohorts: cohorts(now),
    reasons: {
      declared: DECLARED,
      declaredBasis: "38 réponses au questionnaire de départ",
      observed: OBSERVED,
      observedBasis: "112 départs analysés sur 12 mois",
    },
  };
}
