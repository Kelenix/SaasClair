import { describe, expect, it } from "vitest";
import {
  emailHash,
  monthlyCents,
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
      new Map([["prod_starter", "Starter"]]),
    );
    expect(row.plan_name).toBe("Starter");
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
