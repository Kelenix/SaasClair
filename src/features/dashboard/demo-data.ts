// Données de démonstration du SaaS de Nadia (ADR-002) : déterministes, cohérentes entre écrans.
// Les écrans ne connaissent que ces fonctions : brancher les vraies données ne touchera pas l'interface.

import { formatPercent, type NumberFormat } from "@/lib/format";
import { HIGH_RISK_SCORE, WATCHLIST } from "./customers";
import { NADIA_MRR, scale, seeded, timeSlots, trend } from "./demo-utils";
import type { Period } from "./period";

export { NADIA_MRR };

export type Kpi = {
  id: string;
  label: string;
  value: number;
  format: NumberFormat;
  delta: string;
  /** true : bonne nouvelle (émeraude) · false : à surveiller (or) · null : simple repère. */
  isGood: boolean | null;
  trend: number[];
};

export type Insight = {
  id: string;
  area: "Acquisition" | "Conversion" | "Rétention";
  title: string;
  finding: string;
  cause: string;
  action: string;
  impact: string;
  impactEuros: number;
  confidence: "élevée" | "moyenne";
  basis: string;
};

export type RevenueBucket = {
  label: string;
  newMrr: number;
  expansion: number;
  /** Baisses d'offre de clients qui restent. */
  contraction: number;
  /** Revenu des clients partis (churn). */
  lost: number;
};
export type Channel = {
  id: string;
  name: string;
  visitors: number;
  signups: number;
  customers: number;
  revenue: number;
};
export type FunnelStep = { id: string; label: string; count: number; benchmark: number };
export type AtRiskCustomer = {
  id: string;
  name: string;
  initials: string;
  mrr: number;
  score: number;
  reasons: string[];
  renewsInDays: number;
  action: string;
};

export type HomeData = {
  summary: string;
  kpis: Kpi[];
  insights: Insight[];
  revenue: RevenueBucket[];
  channels: Channel[];
  funnel: FunnelStep[];
  atRisk: AtRiskCustomer[];
};

export const PERIOD_STATS: Record<
  Period,
  {
    churn: number;
    churnDelta: string;
    trial: number;
    trialDelta: string;
  }
> = {
  "7j": {
    churn: 6.8,
    churnDelta: "−0,2 pt",
    trial: 18.9,
    trialDelta: "+0,5 pt",
  },
  "30j": {
    churn: 7,
    churnDelta: "−0,6 pt",
    trial: 18.4,
    trialDelta: "+1,2 pt",
  },
  "90j": {
    churn: 7.4,
    churnDelta: "−0,9 pt",
    trial: 17.6,
    trialDelta: "+2,1 pt",
  },
  "12m": {
    churn: 8.1,
    churnDelta: "−1,4 pt",
    trial: 16.9,
    trialDelta: "+3,0 pt",
  },
};

/** Clients qui risquent de partir (score élevé) : la liste courte de l'accueil. */
export const AT_RISK: AtRiskCustomer[] = WATCHLIST.filter(
  (customer) => customer.score >= HIGH_RISK_SCORE,
).map(({ id, name, initials, mrr, score, reasons, renewsInDays, action }) => ({
  id,
  name,
  initials,
  mrr,
  score,
  reasons,
  renewsInDays,
  action,
}));

export const INSIGHTS: Insight[] = [
  {
    id: "2026-44-conversion-mobile",
    area: "Conversion",
    title: "La conversion essai → payant baisse sur mobile.",
    finding:
      "−18 % en 14 jours, concentrée sur les visiteurs mobiles venus d'Instagram (−41 %). Les autres sont stables.",
    cause:
      "63 % d'entre eux abandonnent sur la page de paiement, avec 3 fois plus d'erreurs de formulaire que la moyenne.",
    action: "Vérifiez le formulaire de paiement sur mobile et activez Apple Pay et Google Pay.",
    impact: "+6 à 9 clients par mois",
    impactEuros: 520,
    confidence: "élevée",
    basis: "1 240 sessions analysées",
  },
  {
    id: "2026-44-churn-renouvellements",
    area: "Rétention",
    title: "4 clients à fort risque renouvellent dans les 12 jours.",
    finding:
      "Lumen Bureau, Atelier Cobalt, Verso RH et Orbe Formation : 1 750 € de revenu mensuel en jeu.",
    cause:
      "Connexions en baisse de 60 % sur 3 semaines pour deux d'entre eux ; deux cartes bancaires ont expiré.",
    action:
      "Appelez Lumen Bureau et Atelier Cobalt cette semaine. Envoyez la relance carte aux deux autres.",
    impact: "Jusqu'à 1 750 € par mois gardés",
    impactEuros: 1750,
    confidence: "élevée",
    basis: "historique de 340 clients",
  },
  {
    id: "2026-44-acquisition-linkedin",
    area: "Acquisition",
    title: "LinkedIn amène vos clients les plus fidèles.",
    finding:
      "3 % de churn chez les clients venus de LinkedIn, contre 9 % pour ceux venus d'Instagram.",
    cause:
      "Ils arrivent par vos articles de cas clients et utilisent le produit deux fois plus vite après l'inscription.",
    action: "Publiez deux cas clients de plus ce mois-ci et baissez le budget Instagram de 30 %.",
    impact: "+380 € par mois",
    impactEuros: 380,
    confidence: "moyenne",
    basis: "52 clients venus de LinkedIn",
  },
];

// Revenu mensuel apporté par canal (total = 25 000 €) et volumes pour 30 jours.
const CHANNELS_30D: Channel[] = [
  {
    id: "seo",
    name: "Recherche Google",
    visitors: 7400,
    signups: 520,
    customers: 31,
    revenue: 9800,
  },
  { id: "linkedin", name: "LinkedIn", visitors: 3100, signups: 260, customers: 19, revenue: 6200 },
  {
    id: "direct",
    name: "Accès direct",
    visitors: 4200,
    signups: 210,
    customers: 12,
    revenue: 4100,
  },
  {
    id: "partners",
    name: "Partenaires",
    visitors: 1300,
    signups: 120,
    customers: 8,
    revenue: 3100,
  },
  { id: "instagram", name: "Instagram", visitors: 2400, signups: 180, customers: 5, revenue: 1800 },
];

// Tunnel sur 30 jours, avec le taux de passage habituel pour un SaaS B2B comparable.
const FUNNEL_30D: FunnelStep[] = [
  { id: "visit", label: "Visite", count: 18400, benchmark: 1 },
  { id: "signup", label: "Inscription", count: 1290, benchmark: 0.07 },
  { id: "activation", label: "Activation", count: 720, benchmark: 0.55 },
  { id: "trial", label: "Essai", count: 408, benchmark: 0.58 },
  { id: "payment", label: "Paiement", count: 75, benchmark: 0.25 },
];

// Flux mensuels : 75 nouveaux clients (offre d'entrée), montées et baisses d'offre, 7 % de churn.
const MONTHLY_FLOWS = {
  newMrr: 2150,
  expansion: 760,
  contraction: 152,
  lost: 1750,
} as const;

/** Évolution du revenu : nouveau, expansion, contraction et perdu, découpés selon la période. */
export function revenueBuckets(period: Period, now = new Date()): RevenueBucket[] {
  const random = seeded(`revenu-${period}`);
  const vary = (value: number) => Math.round(value * (0.8 + random() * 0.4));
  return timeSlots(period, now).map(({ label, share }) => ({
    label,
    newMrr: vary(MONTHLY_FLOWS.newMrr * share),
    expansion: vary(MONTHLY_FLOWS.expansion * share),
    contraction: vary(MONTHLY_FLOWS.contraction * share),
    lost: vary(MONTHLY_FLOWS.lost * share),
  }));
}

/** Variation nette du revenu mensuel sur la période. */
export const netRevenue = (buckets: RevenueBucket[]) =>
  buckets.reduce(
    (sum, bucket) => sum + bucket.newMrr + bucket.expansion - bucket.contraction - bucket.lost,
    0,
  );

export function getChannels(period: Period): Channel[] {
  return CHANNELS_30D.map((channel) => ({
    ...channel,
    visitors: scale(channel.visitors, period),
    signups: scale(channel.signups, period),
    customers: Math.max(1, scale(channel.customers, period)),
  }));
}

export function getFunnel(period: Period): FunnelStep[] {
  const steps = FUNNEL_30D.map((step) => ({ ...step, count: scale(step.count, period) }));
  // Le paiement suit le taux essai → payant de la période : mêmes chiffres partout.
  const trial = steps[steps.length - 2].count;
  steps[steps.length - 1].count = Math.round((trial * PERIOD_STATS[period].trial) / 100);
  return steps;
}

const formatCount = (count: number) =>
  count > 1 ? `${count} clients sont à surveiller` : "un client est à surveiller";

export function getHomeData(period: Period, now = new Date()): HomeData {
  const random = seeded(period);
  const stats = PERIOD_STATS[period];
  const atRiskRevenue = AT_RISK.reduce((sum, customer) => sum + customer.mrr, 0);
  // La croissance affichée découle des mêmes flux que le graphique : les deux concordent toujours.
  const revenue = revenueBuckets(period, now);
  const net = netRevenue(revenue);
  const startMrr = NADIA_MRR - net;

  return {
    summary: `Bonne semaine : votre churn baisse, mais ${formatCount(AT_RISK.length)}.`,
    kpis: [
      {
        id: "mrr",
        label: "Revenu mensuel récurrent",
        value: NADIA_MRR,
        format: "euro",
        delta: `+${formatPercent((net / startMrr) * 100, net / startMrr < 0.1 ? 1 : 0)}`,
        isGood: true,
        trend: trend(startMrr, NADIA_MRR, 12, random, 0.015),
      },
      {
        id: "churn",
        label: "Taux de churn",
        value: stats.churn,
        format: "percent",
        delta: stats.churnDelta,
        isGood: true,
        trend: trend(stats.churn + 1.2, stats.churn, 12, random, 0.04),
      },
      {
        id: "at-risk",
        label: "Revenu à risque",
        value: atRiskRevenue,
        format: "euro",
        delta: `${AT_RISK.length} clients`,
        isGood: false,
        trend: trend(atRiskRevenue * 0.55, atRiskRevenue, 12, random, 0.08),
      },
      {
        id: "trial",
        label: "Conversion essai → payant",
        value: stats.trial,
        format: "percent",
        delta: stats.trialDelta,
        isGood: true,
        trend: trend(stats.trial - 1.5, stats.trial, 12, random, 0.03),
      },
    ],
    insights: INSIGHTS,
    revenue,
    channels: getChannels(period),
    funnel: getFunnel(period),
    atRisk: AT_RISK,
  };
}

/** Étape du tunnel la plus en dessous de son taux habituel : mise en évidence en or. */
export function weakestFunnelStep(funnel: FunnelStep[]) {
  let weakest = { index: -1, gap: 0 };
  funnel.forEach((step, index) => {
    if (index === 0) return;
    const gap = step.benchmark - step.count / funnel[index - 1].count;
    if (gap > weakest.gap) weakest = { index, gap };
  });
  return weakest.index;
}
