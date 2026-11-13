import { describe, expect, it } from "vitest";
import {
  changesOf,
  emailHash,
  monthlyCents,
  recurringPart,
  toCustomerRow,
  toInvoiceRow,
  toSubscriptionRow,
} from "./normalize";

const price = (unit: number, interval: string, count = 1) => ({
  unit_amount: unit,
  recurring: { interval, interval_count: count },
});

describe("monthlyCents", () => {
  it("ramène chaque période au mois, quantité comprise", () => {
    expect(monthlyCents({ price: price(7900, "month"), quantity: 1 })).toBe(7900);
    expect(monthlyCents({ price: price(75_840, "year"), quantity: 1 })).toBe(6320);
    expect(monthlyCents({ price: price(2900, "month", 3) })).toBeCloseTo(966.67, 1);
    expect(monthlyCents({ price: price(2900, "month"), quantity: 5 })).toBe(14_500);
  });

  it("un prix ponctuel ne compte pas dans le revenu récurrent", () => {
    expect(monthlyCents({ price: { unit_amount: 5000, recurring: null } })).toBe(0);
  });
});

describe("conversion des objets Stripe", () => {
  it("client : email gardé et empreinte pour le relier au script", () => {
    const row = toCustomerRow("p1", {
      id: "cus_1",
      name: " Lumen Bureau ",
      email: "Nadia@Lumen.fr",
      created: 1_790_000_000,
    });
    expect(row).toMatchObject({ id: "cus_1", name: "Lumen Bureau", email: "Nadia@Lumen.fr" });
    expect(row.email_hash).toBe(emailHash("nadia@lumen.fr"));
  });

  it("abonnement : revenu mensuel, offre et fin de période (ancienne et nouvelle API)", () => {
    const base = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      created: 1_790_000_000,
      cancel_at_period_end: true,
    };
    const items = {
      data: [
        {
          quantity: 2,
          current_period_end: 1_792_000_000,
          price: { ...price(7900, "month"), product: { name: "Pro" } },
        },
      ],
    };
    const row = toSubscriptionRow("p1", { ...base, items });
    expect(row).toMatchObject({ mrr_cents: 15_800, plan_name: "Pro", cancel_at_period_end: true });
    expect(row.current_period_end).toBe(new Date(1_792_000_000_000).toISOString());
    expect(toSubscriptionRow("p1", { ...base, customer: { id: "cus_2" }, items }).customer_id).toBe(
      "cus_2",
    );
  });

  it("abonnement : nom de l'offre retrouvé par la liste des produits", () => {
    const row = toSubscriptionRow(
      "p1",
      {
        id: "sub_2",
        customer: "cus_1",
        status: "active",
        created: 1_790_000_000,
        items: { data: [{ price: { ...price(2900, "month"), product: "prod_starter" } }] },
      },
      { productNames: new Map([["prod_starter", "Starter"]]) },
    );
    expect(row.plan_name).toBe("Starter");
  });

  it("abonnement : remises actives déduites, première facture seulement ignorée", () => {
    const now = 1_790_000_000_000;
    const base = {
      id: "sub_3",
      customer: "cus_1",
      status: "active",
      created: 1_780_000_000,
      items: { data: [{ quantity: 1, price: price(10_000, "month") }] },
    };
    // Ancienne API : une remise, coupon déplié.
    const percent = { coupon: { id: "c1", percent_off: 20, duration: "forever" } };
    expect(toSubscriptionRow("p1", { ...base, discount: percent }, { now }).mrr_cents).toBe(8000);
    // API récente : coupon par identifiant, retrouvé dans la liste des coupons.
    const coupons = new Map([["c2", { id: "c2", amount_off: 1500, duration: "repeating" }]]);
    const recent = { ...base, discounts: [{ source: { coupon: "c2" }, end: 1_800_000_000 }] };
    expect(toSubscriptionRow("p1", recent, { coupons, now }).mrr_cents).toBe(8500);
    // Remise terminée, ou valable sur la première facture seulement : prix plein.
    const over = { ...base, discounts: [{ ...recent.discounts[0], end: 1_785_000_000 }] };
    expect(toSubscriptionRow("p1", over, { coupons, now }).mrr_cents).toBe(10_000);
    const once = { ...base, discount: { coupon: { id: "c3", percent_off: 50, duration: "once" } } };
    expect(toSubscriptionRow("p1", once, { now }).mrr_cents).toBe(10_000);
    // Annuel à 1 200 € avec 120 € de remise par facture : 90 € par mois.
    const yearly = {
      ...base,
      items: { data: [{ quantity: 1, price: price(120_000, "year") }] },
      discount: { coupon: { id: "c4", amount_off: 12_000, duration: "forever" } },
    };
    expect(toSubscriptionRow("p1", yearly, { now }).mrr_cents).toBe(9000);
  });

  it("abonnement à paliers ou à l'usage : signalé, revenu lu sur les factures", () => {
    const row = toSubscriptionRow("p1", {
      id: "sub_4",
      customer: "cus_1",
      status: "active",
      created: 1_790_000_000,
      currency: "USD",
      items: {
        data: [
          { price: price(2900, "month") },
          { price: { recurring: { interval: "month", usage_type: "metered" } } },
        ],
      },
    });
    expect(row).toMatchObject({ mrr_cents: 2900, price_unknown: true, currency: "usd" });
  });

  it("facture : part récurrente ramenée au mois, prorata et remises à part", () => {
    const month = { start: 1_790_000_000, end: 1_790_000_000 + 31 * 86_400 };
    const year = { start: 1_790_000_000, end: 1_790_000_000 + 365 * 86_400 };
    // Ancienne API.
    const old = recurringPart({
      id: "in_2",
      created: 1_790_000_000,
      lines: {
        data: [
          {
            type: "subscription",
            amount: 7900,
            period: month,
            discount_amounts: [{ amount: 900 }],
          },
          { type: "invoiceitem", amount: 5000, period: month },
          { type: "subscription", amount: -2000, proration: true, period: month },
        ],
      },
    });
    expect(old).toMatchObject({ recurring_cents: 7000 });
    // API récente : annuel ramené au mois.
    const recent = recurringPart({
      id: "in_3",
      created: 1_790_000_000,
      lines: {
        data: [
          {
            amount: 120_000,
            period: year,
            parent: {
              type: "subscription_item_details",
              subscription_item_details: { proration: false },
            },
          },
        ],
      },
    });
    expect(recent?.recurring_cents).toBe(10_000);
    expect(recent?.period_end).toBe(new Date(year.end * 1000).toISOString());
    // Facture sans ligne d'abonnement : pas de revenu récurrent.
    expect(recurringPart({ id: "in_4", created: 1_790_000_000 })).toBeNull();
  });

  it("facture : abonnement retrouvé aussi dans la nouvelle structure de l'API", () => {
    const row = toInvoiceRow("p1", {
      id: "in_1",
      customer: "cus_1",
      parent: { subscription_details: { subscription: "sub_1" } },
      status: "open",
      amount_due: 7900,
      attempt_count: 2,
      created: 1_790_000_000,
    });
    expect(row).toMatchObject({
      subscription_id: "sub_1",
      amount_due_cents: 7900,
      attempt_count: 2,
    });
  });
});

describe("suivi des changements (journal des événements Stripe)", () => {
  it("objets à relire, sans doublon ; un client effacé n'est plus relu", () => {
    const event = (type: string, object: Record<string, unknown>) => ({
      id: `evt_${type}`,
      type,
      data: { object },
    });
    const changes = changesOf([
      event("customer.subscription.updated", { id: "sub_1" }),
      event("customer.subscription.deleted", { id: "sub_1" }),
      event("invoice.paid", { id: "in_1" }),
      event("customer.created", { id: "cus_new" }),
      event("customer.updated", { id: "cus_card" }),
      event("payment_method.automatically_updated", { id: "pm_1", customer: "cus_pm" }),
      event("customer.updated", { id: "cus_gone" }),
      event("customer.deleted", { id: "cus_gone" }),
      // Identifiant douteux : jamais placé dans une adresse.
      event("invoice.paid", { id: "in_1/../../v1/accounts" }),
    ]);
    expect([...changes.subscriptions]).toEqual(["sub_1"]);
    expect([...changes.invoices]).toEqual(["in_1"]);
    expect([...changes.customers]).toEqual(["cus_new"]);
    expect([...changes.subscriptionsOf].sort()).toEqual(["cus_card", "cus_pm"]);
    expect([...changes.deletedCustomers]).toEqual(["cus_gone"]);
    expect(changes.total).toBe(6);
  });
});
