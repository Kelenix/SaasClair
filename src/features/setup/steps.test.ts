import { describe, expect, it } from "vitest";
import { platformFor, PLATFORMS } from "./platforms";
import { nextStep, remainingSteps, scriptSnippet, stepOf } from "./steps";

const project = (script: string | null, stripe: string | null) => ({
  site_url: "https://monsaas.fr",
  script_detected_at: script,
  stripe_connected_at: stripe,
});

describe("stepOf", () => {
  it("reprend la configuration là où elle s'était arrêtée", () => {
    expect(stepOf(null)).toBe("site");
    expect(stepOf(project(null, null))).toBe("script");
    expect(stepOf(project("2026-10-30", null))).toBe("stripe");
    expect(stepOf(project("2026-10-30", "2026-10-30"))).toBe("done");
  });
});

describe("étapes passées", () => {
  const none = { site: false, script: false, stripe: false };

  it("un projet sans adresse (étape passée) reprend à l'adresse du site", () => {
    const skipped = { site_url: null, script_detected_at: null, stripe_connected_at: null };
    expect(stepOf(skipped)).toBe("site");
    expect(remainingSteps(skipped)).toEqual(["site", "script", "stripe"]);
  });

  it("liste seulement ce qui reste, dans l'ordre", () => {
    expect(remainingSteps(project("2026-10-30", null))).toEqual(["stripe"]);
    expect(remainingSteps(project("2026-10-30", "2026-10-30"))).toEqual([]);
  });

  it("enchaîne sur l'étape suivante encore à faire", () => {
    expect(nextStep("site", none)).toBe("script");
    expect(nextStep("script", { ...none, script: true })).toBe("stripe");
    expect(nextStep("site", { site: true, script: true, stripe: false })).toBe("stripe");
  });

  it("finit sur l'écran final si tout est fait, sinon sur le tableau de bord", () => {
    expect(nextStep("stripe", { site: true, script: true, stripe: true })).toBe("done");
    expect(nextStep("stripe", { site: true, script: false, stripe: true })).toBe("later");
    expect(nextStep("stripe", none)).toBe("later");
  });
});

describe("scriptSnippet", () => {
  it("produit une seule ligne asynchrone avec la clé du site", () => {
    expect(scriptSnippet("14d5d609", "https://saasclair.com")).toBe(
      '<script async src="https://saasclair.com/s.js" data-site="14d5d609"></script>',
    );
  });
});

describe("platformFor", () => {
  it("ouvre l'onglet de la technologie détectée, sinon « Code HTML »", () => {
    expect(platformFor(["Stripe", "WordPress"]).id).toBe("wordpress");
    expect(platformFor(["Next.js"]).id).toBe("nextjs");
    expect(platformFor(["Framer"]).id).toBe("other");
    expect(platformFor([]).id).toBe("html");
  });

  it("chaque plateforme dit de coller la ligne une seule fois, jamais page par page", () => {
    for (const platform of PLATFORMS) {
      expect(platform.steps.map((step) => step.text).join(" ")).not.toMatch(/toutes vos pages,/);
    }
  });
});
