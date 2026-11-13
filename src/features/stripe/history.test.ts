import { describe, expect, it } from "vitest";
import {
  cohorts,
  flowsBetween,
  mainCurrency,
  monthlyChurn,
  segmentsBySubscription,
  trialConversion,
  type HistorySubscription,
  type RecurringInvoiceRow,
} from "./history";

const now = new Date("2026-10-31T12:00:00Z");
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY).toISOString();

const sub = (id: string, extra: Partial<HistorySubscription> = {}): HistorySubscription => ({
  id,
  customer_id: `cus_${id}`,
  status: "active",
  mrr_cents: 10_000,
  created_at: daysAgo(400),
  ended_at: null,
  ...extra,
});
const invoice = (
  subscription: string,
  from: number,
  to: number,
  cents: number,
  status = "paid",
): RecurringInvoiceRow => ({
  subscription_id: subscription,
  status,
  recurring_cents: cents,
  period_start: daysAgo(from),
  period_end: daysAgo(to),
});

describe("mouvements du revenu tirés des factures", () => {
  const end = now.getTime();
  const start = end - 30 * DAY;

  it("expansion et contraction : le montant facturé change, le client reste", () => {
    const subs = [sub("up"), sub("down"), sub("same")];
    const segments = segmentsBySubscription([
      invoice("up", 40, 10, 5000),
      invoice("up", 10, -20, 10_000),
      invoice("down", 40, 10, 15_000),
      invoice("down", 10, -20, 10_000),
      invoice("same", 40, 10, 10_000),
      invoice("same", 10, -20, 10_000),
    ]);
    const flows = flowsBetween(subs, start, end, segments, true);
    expect(flows).toEqual({
      start: 30_000,
      newMrr: 0,
      expansion: 5000,
      contraction: 5000,
      churned: 0,
    });
  });

  it("toujours : début + nouveaux + expansion − contraction − départs = revenu actuel", () => {
    const subs = [
      sub("a"),
      sub("b", { status: "canceled", ended_at: daysAgo(5) }),
      sub("c", { created_at: daysAgo(3) }),
      sub("d", { mrr_cents: 20_000 }),
    ];
    const segments = segmentsBySubscription([invoice("d", 45, 15, 12_000)]);
    const f = flowsBetween(subs, start, end, segments, true);
    const current = subs.filter((s) => !s.ended_at).reduce((t, s) => t + s.mrr_cents, 0);
    expect(f.start + f.newMrr + f.expansion - f.contraction - f.churned).toBe(current);
    expect(f.expansion).toBe(8000);
  });

  it("sans facture importée : le prix actuel de l'abonnement", () => {
    const flows = flowsBetween([sub("a")], start, end, new Map(), true);
    expect(flows).toMatchObject({ start: 10_000, expansion: 0, contraction: 0 });
  });

  it("une facture annulée ou brouillon ne compte pas dans l'historique", () => {
    const segments = segmentsBySubscription([invoice("a", 40, 10, 1, "void")]);
    expect(segments.size).toBe(0);
  });
});

describe("churn ramené au mois", () => {
  // 100 clients ; 7 partent chaque mois depuis un an.
  const subs = Array.from({ length: 100 }, (_, i) =>
    sub(
      `s${i}`,
      i < 84 ? { status: "canceled", ended_at: daysAgo(15 + Math.floor(i / 7) * 30.4) } : {},
    ),
  );

  it("sur 12 mois : le churn d'un mois moyen, pas le cumul de l'année", () => {
    const end = now.getTime();
    const yearly = monthlyChurn(subs, end - 365 * DAY, end, new Map(), true);
    // 84 départs sur l'année, mais environ 7 à 12 % par mois (la base diminue) : jamais 84 %.
    expect(yearly.customer).toBeGreaterThan(6);
    expect(yearly.customer).toBeLessThan(15);
  });

  it("sur 30 jours : départs du mois ÷ clients du début du mois", () => {
    const end = now.getTime();
    const monthly = monthlyChurn(subs, end - 30 * DAY, end, new Map(), true);
    // 7 départs sur 23 clients encore là il y a 30 jours.
    expect(monthly.customer).toBeCloseTo((7 / 23) * 100, 0);
  });

  it("sur 7 jours : ramené au mois", () => {
    const end = now.getTime();
    const few = [
      sub("a"),
      sub("b"),
      sub("c"),
      sub("d", { status: "canceled", ended_at: daysAgo(2) }),
    ];
    const weekly = monthlyChurn(few, end - 7 * DAY, end, new Map(), true);
    // 25 % en une semaine : bien plus sur un mois, jamais plus de 100 %.
    expect(weekly.customer).toBeGreaterThan(25);
    expect(weekly.customer).toBeLessThanOrEqual(100);
  });
});

describe("cohortes", () => {
  it("clients regroupés par mois du premier paiement, part restante à chaque fin de mois", () => {
    const subs = [
      sub("a", { created_at: "2026-07-05T10:00:00Z" }),
      sub("b", {
        created_at: "2026-07-20T10:00:00Z",
        status: "canceled",
        ended_at: "2026-08-15T10:00:00Z",
      }),
      sub("c", { created_at: "2026-09-10T10:00:00Z" }),
      // Changement d'offre : même client, pas une nouvelle arrivée.
      sub("c2", { customer_id: "cus_c", created_at: "2026-10-01T10:00:00Z" }),
    ];
    const result = cohorts(subs, now);
    const july = result.find((cohort) => cohort.size === 2)!;
    // Fin juillet : 2 sur 2 ; fin août et fin septembre : 1 sur 2.
    expect(july.retention).toEqual([100, 50, 50]);
    const september = result.at(-1)!;
    expect(september).toMatchObject({ size: 1, retention: [100] });
    expect(result).toHaveLength(2);
  });
});

describe("conversion des essais", () => {
  it("essais terminés sur la période, convertis ou non (annulés pendant l'essai compris)", () => {
    const end = now.getTime();
    const subs = [
      sub("ok", { created_at: daysAgo(20), trial_end: daysAgo(6) }),
      sub("no", {
        created_at: daysAgo(20),
        trial_end: daysAgo(6),
        status: "canceled",
        ended_at: daysAgo(6),
      }),
      sub("quit", {
        created_at: daysAgo(10),
        trial_end: daysAgo(-4),
        status: "canceled",
        ended_at: daysAgo(3),
      }),
      sub("paused", { created_at: daysAgo(20), trial_end: daysAgo(6), status: "paused" }),
      sub("running", { created_at: daysAgo(3), trial_end: daysAgo(-11), status: "trialing" }),
    ];
    expect(trialConversion(subs, end - 30 * DAY, end)).toEqual({
      ended: 4,
      converted: 1,
      rate: 25,
    });
    expect(trialConversion([sub("plain")], end - 30 * DAY, end)).toBeNull();
  });
});

describe("devise principale", () => {
  it("celle du plus grand nombre d'abonnements payants, l'euro à égalité", () => {
    const usd = (id: string) => ({ ...sub(id), currency: "usd" });
    const eur = (id: string) => ({ ...sub(id), currency: "eur" });
    expect(mainCurrency([usd("a"), usd("b"), eur("c")])).toBe("usd");
    expect(mainCurrency([usd("a"), eur("c")])).toBe("eur");
    expect(mainCurrency([])).toBe("eur");
  });
});
