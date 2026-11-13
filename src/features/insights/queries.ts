import "server-only";
import { cache } from "react";
import type { RealAcquisition } from "@/features/collect/aggregate";
import { getRealAcquisition } from "@/features/collect/queries";
import { getDashboardContext } from "@/features/dashboard/context";
import type { Period } from "@/features/dashboard/period";
import type { RealRevenue } from "@/features/stripe/metrics";
import { getRealRevenue } from "@/features/stripe/queries";
import { buildInsights, type InsightFacts } from "./engine";

/** Les insights portent toujours sur les 30 derniers jours, quelle que soit la période affichée. */
export const INSIGHT_PERIOD: Period = "30j";

type Prefetched = { period: Period; revenue: RealRevenue | null; visits: RealAcquisition };

/**
 * Faits du compte connecté, lus une fois par requête. Une page qui a déjà lu revenus et visites
 * sur 30 jours les passe, pour ne pas relire Stripe et les visites deux fois.
 */
export async function getInsightFacts(prefetched?: Prefetched): Promise<InsightFacts> {
  const context = await getDashboardContext();
  const now = new Date();
  const [revenue, visits] =
    prefetched?.period === INSIGHT_PERIOD
      ? [prefetched.revenue, prefetched.visits]
      : await Promise.all([
          getRealRevenue(INSIGHT_PERIOD, now),
          getRealAcquisition(INSIGHT_PERIOD, now),
        ]);
  return { now, siteUrl: context.siteUrl, audit: context.audit, revenue, visits };
}

export const getRealInsights = cache(async () => buildInsights(await getInsightFacts()));
