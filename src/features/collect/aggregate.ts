import { CHANNEL_LABELS, type Channel } from "@/features/attribution/attribution";
import { PERIOD_DAYS, type Period } from "@/features/dashboard/period";

// Écran Acquisition calculé sur les vraies visites : un visiteur compte une fois sur la période,
// avec le canal, la page d'entrée et l'appareil de sa première visite.

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
};

const BUCKETS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 13, "12m": 12 };
const TOP = 8;

export const periodStart = (period: Period, now: Date) =>
  new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);

function rank(counts: Map<string, number>, total: number, name = (id: string) => id): Ranked[] {
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP)
    .map(([id, visitors]) => ({
      id,
      name: name(id),
      visitors,
      share: total ? Math.round((visitors / total) * 1000) / 10 : 0,
    }));
}

const bump = (counts: Map<string, number>, key: string | null) => {
  if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
};

/** Agrège les pages vues de la période (triées de la plus ancienne à la plus récente). */
export function aggregateVisits(rows: VisitRow[], period: Period, now: Date): RealAcquisition {
  const start = periodStart(period, now).getTime();
  const span = now.getTime() - start;
  const bucketCount = BUCKETS[period];
  const firstVisit = new Map<string, VisitRow>();
  const trendSets = Array.from({ length: bucketCount }, () => new Set<string>());

  for (const row of rows) {
    if (!firstVisit.has(row.visitor_id)) firstVisit.set(row.visitor_id, row);
    const index = Math.floor(((Date.parse(row.occurred_at) - start) / span) * bucketCount);
    trendSets[Math.min(bucketCount - 1, Math.max(0, index))].add(row.visitor_id);
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

  const visitors = firstVisit.size;
  return {
    visitors,
    pageviews: rows.length,
    mobileShare: visitors ? Math.round((mobile / visitors) * 1000) / 10 : 0,
    trend: trendSets.map((set) => set.size),
    channels: rank(channels, visitors, (id) => CHANNEL_LABELS[id as Channel] ?? id),
    landingPages: rank(landing, visitors),
    campaigns: rank(campaigns, visitors),
    referrers: rank(referrers, visitors),
  };
}
