import { describe, expect, it } from "vitest";
import { linkCustomers } from "./linking";

describe("linkCustomers", () => {
  const customers = [
    { id: "cus_a", email_hash: "ha" },
    { id: "cus_b", email_hash: "hb" },
    { id: "cus_c", email_hash: "hc" },
    { id: "cus_d", email_hash: null },
  ];
  const touches = [
    { email_hash: "ha", channel: "seo" },
    { email_hash: "hb", channel: "seo" },
    { email_hash: "hc", channel: "linkedin" },
    { email_hash: "hz", channel: "ads" },
  ];

  it("revenu par canal d'arrivée et couverture honnête", () => {
    const links = linkCustomers(
      { cus_a: 49, cus_b: 99, cus_c: 29, cus_d: 79, cus_e: 0 },
      customers,
      touches,
      (id) => (id === "seo" ? "Recherche Google" : "LinkedIn"),
    );
    expect(links).toEqual({
      paying: 4,
      linked: 3,
      coverage: 75,
      byChannel: [
        { id: "seo", name: "Recherche Google", customers: 2, mrr: 148 },
        { id: "linkedin", name: "LinkedIn", customers: 1, mrr: 29 },
      ],
    });
  });

  it("sans identification : 0 % relié, rien d'inventé", () => {
    expect(linkCustomers({ cus_a: 49 }, customers, [])).toEqual({
      paying: 1,
      linked: 0,
      coverage: 0,
      byChannel: [],
    });
  });
});
