import { describe, expect, it } from "vitest";
import {
  adviceFor,
  computeFunnel,
  funnelFromSummary,
  MIN_SAMPLE,
  pathOf,
  STEP_ADVICE,
  type FunnelRow,
} from "./funnel";

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
    // Section « Tarifs » de l'accueil : pas une page que le tunnel peut mesurer.
    expect(pathOf("https://x.fr/#tarifs", "https://x.fr")).toBeNull();
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
    // 4 visiteurs : trop peu pour désigner une étape à corriger.
    expect(funnel.weakest).toBe(-1);
  });

  it("segments par appareil et canal vers la dernière étape", () => {
    const funnel = computeFunnel(rows, { pricing: "/tarifs", signup: "/essai" }, (id) =>
      id === "seo" ? "Recherche Google" : "Accès direct",
    );
    expect(funnel.segments.device).toEqual([
      { id: "desktop", name: "Ordinateur", visitors: 2, rate: 50 },
      { id: "mobile", name: "Mobile", visitors: 2, rate: 0 },
    ]);
    // À égalité de visiteurs, ordre alphabétique : toujours le même affichage.
    expect(funnel.segments.channel.map((s) => [s.name, s.rate])).toEqual([
      ["Accès direct", 0],
      ["Recherche Google", 50],
    ]);
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

describe("tunnel jusqu'au paiement (Stripe connecté)", () => {
  it("essai démarré et clients payants, comptés parmi les inscrits reliés à Stripe", () => {
    const group = (extra: object, visitors: number) => ({
      device: "desktop",
      channel: "seo",
      pricing: true,
      signup: true,
      identified: true,
      trial: false,
      paid: false,
      visitors,
      ...extra,
    });
    const summary = {
      groups: [
        group({ identified: false }, 60),
        group({}, 20),
        group({ trial: true }, 12),
        group({ trial: true, paid: true }, 8),
      ],
      paths: [],
    };
    const paths = { pricing: "/tarifs", signup: "/essai" };
    const funnel = funnelFromSummary(summary, paths, (id) => id, { stripe: true });
    expect(funnel.steps.map((step) => [step.id, step.count])).toEqual([
      ["visit", 100],
      ["pricing", 100],
      ["signup", 100],
      ["identified", 40],
      ["trial", 20],
      ["paid", 8],
    ]);
    // Sans Stripe : le tunnel s'arrête aux inscrits.
    expect(funnelFromSummary(summary, paths).steps.at(-1)?.id).toBe("identified");
  });
});

describe("étape à corriger en premier", () => {
  const group = (extra: object, visitors: number) => ({
    device: "desktop",
    channel: "seo",
    pricing: false,
    signup: false,
    identified: false,
    visitors,
    ...extra,
  });
  const paths = { pricing: "/tarifs", signup: "/essai" };

  it("désignée seulement avec assez de visiteurs à l'étape d'avant", () => {
    // 100 visiteurs → 40 tarifs → 4 inscriptions ouvertes → 1 inscrit. La chute 4 → 1 est
    // la plus forte en taux, mais 4 personnes ne suffisent pas : c'est tarifs → inscription.
    const summary = {
      groups: [
        group({}, 60),
        group({ pricing: true }, 36),
        group({ pricing: true, signup: true }, 3),
        group({ pricing: true, signup: true, identified: true }, 1),
      ],
      paths: [],
    };
    const funnel = funnelFromSummary(summary, paths);
    expect(funnel.steps.map((step) => step.count)).toEqual([100, 40, 4, 1]);
    expect(funnel.steps[funnel.weakest].id).toBe("signup");
  });

  it(`moins de ${MIN_SAMPLE} visiteurs : aucune étape désignée`, () => {
    const summary = { groups: [group({}, 2)], paths: [] };
    expect(funnelFromSummary(summary, { pricing: null, signup: "/essai" }).weakest).toBe(-1);
  });

  it("n'accuse pas les tarifs quand les visiteurs n'en ont pas vu", () => {
    const visit = { id: "visit", label: "Visiteurs", count: 50 } as const;
    const pricing = { id: "pricing", label: "Tarifs vus", count: 20 } as const;
    const signup = { id: "signup", label: "Inscription ouverte", count: 2 } as const;
    const identified = { id: "identified", label: "Inscrits", count: 1 } as const;
    expect(adviceFor(signup, visit)?.title).toBe("Peu de visiteurs vont jusqu'à l'inscription.");
    expect(adviceFor(identified, visit)?.title).toBe(
      "Peu de visiteurs vont jusqu'à l'inscription.",
    );
    expect(adviceFor(signup, pricing)).toBe(STEP_ADVICE.signup);
    expect(adviceFor(identified, pricing)).toBe(STEP_ADVICE.signup);
    expect(adviceFor(identified, signup)).toBe(STEP_ADVICE.identified);
  });
});
