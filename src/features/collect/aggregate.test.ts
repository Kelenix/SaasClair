import { describe, expect, it } from "vitest";
import { aggregateVisits, type VisitRow } from "./aggregate";

const now = new Date("2026-10-31T12:00:00Z");
const visit = (visitor: string, day: number, extra: Partial<VisitRow> = {}): VisitRow => ({
  visitor_id: visitor,
  occurred_at: new Date(now.getTime() - day * 86_400_000).toISOString(),
  path: "/",
  channel: "direct",
  utm_campaign: null,
  referrer_host: null,
  device: "desktop",
  ...extra,
});

describe("aggregateVisits", () => {
  const rows = [
    visit("a", 6, {
      channel: "linkedin",
      path: "/tarifs",
      referrer_host: "linkedin.com",
      utm_campaign: "lancement",
    }),
    visit("b", 5, { channel: "seo", device: "mobile", referrer_host: "google.com" }),
    visit("a", 4, { channel: "direct", path: "/inscription" }),
    visit("c", 1, { channel: "linkedin", device: "mobile", referrer_host: "linkedin.com" }),
  ];
  const result = aggregateVisits(rows, "7j", now);

  it("compte chaque visiteur une fois, avec sa première visite", () => {
    expect(result.visitors).toBe(3);
    expect(result.pageviews).toBe(4);
    expect(result.channels[0]).toEqual({
      id: "linkedin",
      name: "LinkedIn",
      visitors: 2,
      share: 66.7,
    });
    expect(result.landingPages.map((page) => page.id)).toEqual(["/", "/tarifs"]);
    expect(result.campaigns).toEqual([
      { id: "lancement", name: "lancement", visitors: 1, share: 33.3 },
    ]);
    expect(result.referrers[0]).toMatchObject({ id: "linkedin.com", visitors: 2 });
    expect(result.mobileShare).toBe(66.7);
  });

  it("répartit les visiteurs sur la période pour les mini-courbes", () => {
    expect(result.trend).toHaveLength(7);
    expect(result.trend.reduce((sum, n) => sum + n, 0)).toBe(4);
  });

  it("une période sans visite donne des zéros, pas des chiffres inventés", () => {
    const empty = aggregateVisits([], "30j", now);
    expect(empty).toMatchObject({ visitors: 0, pageviews: 0, mobileShare: 0, channels: [] });
  });
});
