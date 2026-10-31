// Écran « Revenus » : revenu mensuel récurrent, ce qui le fait bouger et l'argent à récupérer.

import { formatEuro, formatPercent } from "@/lib/format";
import { FAILED_PAYMENTS, type FailedPayment } from "../customers";
import {
  netRevenue,
  PERIOD_STATS,
  revenueBuckets,
  type Kpi,
  type RevenueBucket,
} from "../demo-data";
import { NADIA_CUSTOMERS, NADIA_MRR, scale, seeded, trend } from "../demo-utils";
import type { Period } from "../period";

export type Flow = {
  id: "new" | "expansion" | "contraction" | "churn";
  label: string;
  detail: string;
  /** Positif : revenu gagné · négatif : revenu perdu. */
  amount: number;
};
export type MrrPoint = { label: string; mrr: number };

export type RevenueData = {
  summary: string;
  kpis: Kpi[];
  startMrr: number;
  flows: Flow[];
  history: MrrPoint[];
  failedPayments: FailedPayment[];
  recoveredAutomatically: number;
};

export function getRevenueData(period: Period, now = new Date()): RevenueData {
  const random = seeded(`revenus-${period}`);
  const buckets = revenueBuckets(period, now);
  const net = netRevenue(buckets);
  const startMrr = NADIA_MRR - net;
  const sum = (key: keyof Omit<RevenueBucket, "label">) =>
    buckets.reduce((total, bucket) => total + bucket[key], 0);
  const churn = PERIOD_STATS[period].churn;
  const arpa = NADIA_MRR / NADIA_CUSTOMERS;
  const lifetimeMonths = Math.round(100 / churn);
  const failed = FAILED_PAYMENTS.reduce((total, payment) => total + payment.amount, 0);

  let running = startMrr;
  const history = buckets.map((bucket) => {
    running += bucket.newMrr + bucket.expansion - bucket.contraction - bucket.lost;
    return { label: bucket.label, mrr: running };
  });

  return {
    summary: `Votre revenu mensuel a gagné ${formatEuro(net)} sur la période. Les montées en gamme compensent ${Math.round((sum("expansion") / sum("lost")) * 100)} % des départs.`,
    kpis: [
      {
        id: "mrr",
        label: "Revenu mensuel récurrent",
        value: NADIA_MRR,
        format: "euro",
        delta: `+${formatPercent((net / startMrr) * 100, net / startMrr < 0.1 ? 1 : 0)}`,
        isGood: true,
        trend: [startMrr, ...history.map((point) => point.mrr)],
      },
      {
        id: "arpa",
        label: "Revenu moyen par client",
        value: Math.round(arpa),
        format: "euro",
        delta: `${NADIA_CUSTOMERS} clients payants`,
        isGood: null,
        trend: trend(arpa * 0.96, arpa, 12, random, 0.01),
      },
      {
        id: "ltv",
        label: "Valeur vie client",
        value: Math.round(arpa * lifetimeMonths),
        format: "euro",
        delta: `${lifetimeMonths} mois de fidélité en moyenne`,
        isGood: null,
        trend: trend(arpa * lifetimeMonths * 0.85, arpa * lifetimeMonths, 12, random, 0.02),
      },
      {
        id: "failed",
        label: "Paiements échoués à récupérer",
        value: failed,
        format: "euro",
        delta: `${FAILED_PAYMENTS.length} paiements`,
        isGood: false,
        trend: trend(failed * 0.7, failed, 12, random, 0.1),
      },
    ],
    startMrr,
    flows: [
      {
        id: "new",
        label: "Nouveaux clients",
        detail: `${scale(75, period)} clients`,
        amount: sum("newMrr"),
      },
      {
        id: "expansion",
        label: "Expansion",
        detail: "Montées en gamme et places ajoutées",
        amount: sum("expansion"),
      },
      {
        id: "contraction",
        label: "Contraction",
        detail: "Offres réduites, sans départ",
        amount: -sum("contraction"),
      },
      {
        id: "churn",
        label: "Départs",
        detail: `${Math.max(1, scale(24, period))} clients partis`,
        amount: -sum("lost"),
      },
    ],
    history,
    failedPayments: FAILED_PAYMENTS,
    recoveredAutomatically: scale(640, period),
  };
}
