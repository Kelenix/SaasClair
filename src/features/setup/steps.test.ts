import { describe, expect, it } from "vitest";
import { scriptSnippet, stepOf } from "./steps";

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

describe("scriptSnippet", () => {
  it("produit une seule ligne asynchrone avec la clé du site", () => {
    expect(scriptSnippet("14d5d609")).toBe(
      '<script async src="https://cdn.saasclair.fr/s.js" data-site="14d5d609"></script>',
    );
  });
});
