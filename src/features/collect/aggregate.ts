import { CHANNEL_LABELS, type Channel } from "@/features/attribution/attribution";
import { PERIOD_DAYS, type Period } from "@/features/dashboard/period";

// Écran Acquisition calculé sur les vraies visites : un visiteur compte une fois sur la période,
// avec le canal, la page d'entrée et l'appareil de sa première visite. Le regroupement est fait
// par la base (fonction SQL acquisition_summary, quelle que soit la quantité de visites) ;
// summarizeVisits en est la version de référence, testée, sur des lignes.

export type VisitRow = {
  visitor_id: string;
  occurred_at: string;
  path: string;
  channel: string;
  utm_campaign: string | null;
  referrer_host: string | null;
  device: string | null;
};

export type Ranked = { id: string; name: string; visitors: number; share: number };

export type RealAcquisition = {
  visitors: number;
  pageviews: number;
  mobileShare: number;
  /** Visiteurs par tranche de la période (jours, semaines ou mois), pour les mini-courbes. */
  trend: number[];
  channels: Ranked[];
  landingPages: Ranked[];
  campaigns: Ranked[];
  referrers: Ranked[];
  /** Nouveaux inscrits de la période, par canal d'arrivée (part : sur le total des inscrits). */
  signups: Ranked[];
  signupsTotal: number;
};

/** Ce que renvoie acquisition_summary : totaux, tranches et classements [clé, visiteurs]. */
export type AcquisitionSummary = {
  visitors: number;
  pageviews: number;
  mobile: number;
  trend: [number, number][];
  channels: [string, number][];
  landing: [string, number][];
  campaigns: [string, number][];
  referrers: [string, number][];
  /** Nouveaux inscrits par canal (identifications), et leur total. */
  signups?: [string, number][];
  signupsTotal?: number;
};

export const BUCKETS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 13, "12m": 12 };
/** Taille des classements (même valeur dans la fonction SQL). */
export const TOP = 8;

export const periodStart = (period: Period, now: Date) =>
  new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);

/** Les plus fréquents d'abord ; à égalité, l'ordre alphabétique (comme la base). */
const top = (counts: Map<string, number>): [string, number][] =>
  [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP);

const bump = (counts: Map<string, number>, key: string | null) => {
  if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
};

/** Regroupement de référence (même règle que acquisition_summary), sur des pages vues triées. */
export function summarizeVisits(rows: VisitRow[], period: Period, now: Date): AcquisitionSummary {
  const start = periodStart(period, now).getTime();
  const span = now.getTime() - start;
  const bucketCount = BUCKETS[period];
  const firstVisit = new Map<string, VisitRow>();
  const trendSets = new Map<number, Set<string>>();

  for (const row of rows) {
    if (!firstVisit.has(row.visitor_id)) firstVisit.set(row.visitor_id, row);
    const raw = Math.floor(((Date.parse(row.occurred_at) - start) / span) * bucketCount);
    const index = Math.min(bucketCount - 1, Math.max(0, raw));
    const set = trendSets.get(index) ?? new Set<string>();
    set.add(row.visitor_id);
    trendSets.set(index, set);
  }

  const channels = new Map<string, number>();
  const landing = new Map<string, number>();
  const campaigns = new Map<string, number>();
  const referrers = new Map<string, number>();
  let mobile = 0;
  for (const visit of firstVisit.values()) {
    bump(channels, visit.channel);
    bump(landing, visit.path);
    bump(campaigns, visit.utm_campaign);
    bump(referrers, visit.referrer_host);
    if (visit.device === "mobile") mobile += 1;
  }
  return {
    visitors: firstVisit.size,
    pageviews: rows.length,
    mobile,
    trend: [...trendSets].map(([index, set]) => [index, set.size]),
    channels: top(channels),
    landing: top(landing),
    campaigns: top(campaigns),
    referrers: top(referrers),
    // Les inscriptions viennent des identifications, absentes de ces pages vues.
    signups: [],
    signupsTotal: 0,
  };
}

function rank(pairs: [string, number][], total: number, name = (id: string) => id): Ranked[] {
  return pairs.map(([id, visitors]) => ({
    id,
    name: name(id),
    visitors,
    share: total ? Math.round((visitors / total) * 1000) / 10 : 0,
  }));
}

/** Écran Acquisition à partir du regroupement (base ou référence). */
export function acquisitionFromSummary(
  summary: AcquisitionSummary | null,
  period: Period,
): RealAcquisition {
  const data = summary ?? {
    visitors: 0,
    pageviews: 0,
    mobile: 0,
    trend: [],
    channels: [],
    landing: [],
    campaigns: [],
    referrers: [],
  };
  const trend = Array.from({ length: BUCKETS[period] }, () => 0);
  for (const [index, visitors] of data.trend) {
    if (index >= 0 && index < trend.length) trend[index] = visitors;
  }
  const { visitors } = data;
  return {
    visitors,
    pageviews: data.pageviews,
    mobileShare: visitors ? Math.round((data.mobile / visitors) * 1000) / 10 : 0,
    trend,
    channels: rank(data.channels, visitors, (id) => CHANNEL_LABELS[id as Channel] ?? id),
    landingPages: rank(data.landing, visitors),
    campaigns: rank(data.campaigns, visitors),
    referrers: rank(data.referrers, visitors),
    signups: rank(
      data.signups ?? [],
      data.signupsTotal ?? 0,
      (id) => CHANNEL_LABELS[id as Channel] ?? id,
    ),
    signupsTotal: data.signupsTotal ?? 0,
  };
}

/** Agrège des pages vues (triées de la plus ancienne à la plus récente). */
export const aggregateVisits = (rows: VisitRow[], period: Period, now: Date) =>
  acquisitionFromSummary(summarizeVisits(rows, period, now), period);
