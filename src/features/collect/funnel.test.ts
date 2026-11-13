import { describe, expect, it } from "vitest";
import { computeFunnel, pathOf, type FunnelRow } from "./funnel";

const row = (visitor: string, path: string, extra: Partial<FunnelRow> = {}): FunnelRow => ({
  visitor_id: visitor,
  type: "pageview",
  path,
  device: "desktop",
  channel: "seo",
  ...extra,
});

describe("pathOf", () => {
  it("chemin d'une page du même site, sous-domaine compris", () => {
    expect(pathOf("https://www.x.fr/tarifs/", "https://x.fr")).toBe("/tarifs");
    expect(pathOf("https://app.x.fr/signup", "https://x.fr")).toBe("/signup");
    expect(pathOf("https://checkout.stripe.com/pay", "https://x.fr")).toBeNull();
    expect(pathOf(null, "https://x.fr")).toBeNull();
  });
});

describe("computeFunnel", () => {
  const rows = [
    row("a", "/"),
    row("a", "/tarifs"),
    row("a", "/essai"),
    row("a", "/essai", { type: "identify" }),
    row("b", "/", { device: "mobile", channel: "direct" }),
    row("b", "/tarifs", { device: "mobile", channel: "direct" }),
    // c ouvre l'inscription sans passer par les tarifs : compté aux deux étapes.
    row("c", "/essai/etape-1"),
    row("d", "/blog", { device: "mobile", channel: "direct" }),
  ];

  it("visiteurs → tarifs → inscription → inscrits, chaque étape comptant ceux qui l'ont atteinte", () => {
    const funnel = computeFunnel(rows, { pricing: "/tarifs", signup: "/essai" });
    expect(funnel.steps.map((step) => [step.id, step.count])).toEqual([
      ["visit", 4],
      ["pricing", 3],
      ["signup", 2],
      ["identified", 1],
    ]);
    // 1 inscrit sur 2 inscriptions ouvertes (50 %) : la plus forte perte.
    expect(funnel.weakest).toBe(3);
  });

  it("segments par appareil et canal vers la dernière étape", () => {
    const funnel = computeFunnel(rows, { pricing: "/tarifs", signup: "/essai" }, (id) =>
      id === "seo" ? "Recherche Google" : "Accès direct",
    );
    expect(funnel.segments.device).toEqual([
      { id: "desktop", name: "Ordinateur", visitors: 2, rate: 50 },
      { id: "mobile", name: "Mobile", visitors: 2, rate: 0 },
    ]);
    expect(funnel.segments.channel[0].name).toBe("Recherche Google");
  });

  it("page clé inconnue : étape absente, et la page la plus probable proposée", () => {
    const funnel = computeFunnel(rows, { pricing: null, signup: null });
    expect(funnel.steps.map((step) => step.id)).toEqual(["visit", "identified"]);
    expect(funnel.guesses).toEqual({ pricing: "/tarifs", signup: "/essai" });
  });

  it("sans page clé ni inscription : pas de tunnel à dessiner", () => {
    const funnel = computeFunnel([row("a", "/")], { pricing: null, signup: null });
    expect(funnel.steps).toHaveLength(1);
    expect(funnel.weakest).toBe(-1);
  });
});
