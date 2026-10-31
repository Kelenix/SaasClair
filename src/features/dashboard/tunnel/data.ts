// Écran « Tunnel de conversion » : où les visiteurs s'arrêtent, et chez qui.

import { formatPercent } from "@/lib/format";
import {
  getFunnel,
  INSIGHTS,
  PERIOD_STATS,
  weakestFunnelStep,
  type FunnelStep,
  type Insight,
  type Kpi,
} from "../demo-data";
import { seeded, trend } from "../demo-utils";
import type { Period } from "../period";

/** Taux de passage d'une étape à la suivante : inscription, activation, essai, paiement. */
export type SegmentRow = { id: string; name: string; share: number; rates: number[] };
export type Comparison = { id: string; label: string; segments: SegmentRow[] };

export type TunnelData = {
  summary: string;
  kpis: Kpi[];
  funnel: FunnelStep[];
  weakest: number;
  cause: Insight;
  comparisons: Comparison[];
};

const COMPARISONS: Comparison[] = [
  {
    id: "device",
    label: "Appareil",
    segments: [
      { id: "desktop", name: "Ordinateur", share: 0.58, rates: [0.078, 0.6, 0.6, 0.235] },
      { id: "mobile", name: "Mobile", share: 0.36, rates: [0.058, 0.49, 0.53, 0.092] },
      { id: "tablet", name: "Tablette", share: 0.06, rates: [0.07, 0.55, 0.57, 0.17] },
    ],
  },
  {
    id: "country",
    label: "Pays",
    segments: [
      { id: "fr", name: "France", share: 0.71, rates: [0.071, 0.56, 0.57, 0.19] },
      { id: "be", name: "Belgique", share: 0.12, rates: [0.074, 0.57, 0.58, 0.2] },
      { id: "ch", name: "Suisse", share: 0.08, rates: [0.066, 0.55, 0.56, 0.21] },
      { id: "ca", name: "Canada", share: 0.09, rates: [0.064, 0.53, 0.55, 0.12] },
    ],
  },
  {
    id: "channel",
    label: "Canal",
    segments: [
      { id: "seo", name: "Recherche Google", share: 0.4, rates: [0.07, 0.57, 0.58, 0.21] },
      { id: "linkedin", name: "LinkedIn", share: 0.17, rates: [0.084, 0.62, 0.6, 0.25] },
      { id: "direct", name: "Accès direct", share: 0.23, rates: [0.05, 0.52, 0.56, 0.2] },
      { id: "partners", name: "Partenaires", share: 0.07, rates: [0.092, 0.6, 0.59, 0.24] },
      { id: "instagram", name: "Instagram", share: 0.13, rates: [0.075, 0.45, 0.5, 0.07] },
    ],
  },
];

/** Case la plus en retard sur le taux d'ensemble : [segment, étape], mise en évidence en or. */
export function weakestCell(segments: SegmentRow[], overall: number[]) {
  let weakest = { segment: -1, step: -1, ratio: 1 };
  segments.forEach((segment, row) =>
    segment.rates.forEach((value, step) => {
      const ratio = value / overall[step];
      if (ratio < weakest.ratio) weakest = { segment: row, step, ratio };
    }),
  );
  return weakest;
}

/** Taux de passage de chaque étape du tunnel vers la suivante. */
export const stepRates = (funnel: FunnelStep[]) =>
  funnel.slice(1).map((step, index) => step.count / funnel[index].count);

export function getTunnelData(period: Period): TunnelData {
  const random = seeded(`tunnel-${period}`);
  const funnel = getFunnel(period);
  const rates = stepRates(funnel);
  const weakest = weakestFunnelStep(funnel);
  const overall = funnel[funnel.length - 1].count / funnel[0].count;
  const stats = PERIOD_STATS[period];
  // Clients en plus si le paiement retrouvait son taux habituel.
  const gain = Math.max(0, Math.round(funnel[3].count * (funnel[4].benchmark - rates[3])));
  const usual = (step: number) => `Habituel : ${formatPercent(funnel[step].benchmark * 100)}`;

  return {
    summary: `${formatPercent(overall * 100, 2)} de vos visiteurs deviennent clients. C'est au ${funnel[weakest].label.toLowerCase()} que vous en perdez le plus, surtout sur mobile.`,
    kpis: [
      {
        id: "signup",
        label: "Visite → inscription",
        value: rates[0] * 100,
        format: "percent",
        delta: usual(1),
        isGood: null,
        trend: trend(rates[0] * 95, rates[0] * 100, 12, random, 0.04),
      },
      {
        id: "activation",
        label: "Inscription → activation",
        value: rates[1] * 100,
        format: "percent",
        delta: usual(2),
        isGood: null,
        trend: trend(rates[1] * 97, rates[1] * 100, 12, random, 0.03),
      },
      {
        id: "trial",
        label: "Essai → paiement",
        value: stats.trial,
        format: "percent",
        delta: stats.trialDelta,
        isGood: true,
        trend: trend(stats.trial - 1.5, stats.trial, 12, random, 0.03),
      },
      {
        id: "payment",
        label: "Clients à gagner",
        value: gain,
        format: "number",
        delta: `Avec ${formatPercent(funnel[4].benchmark * 100, 0)} d'essais convertis`,
        isGood: false,
        trend: trend(gain * 0.7, gain, 12, random, 0.06),
      },
    ],
    funnel,
    weakest,
    cause: INSIGHTS[0],
    comparisons: COMPARISONS,
  };
}
