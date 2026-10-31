import { describe, expect, it } from "vitest";
import { safeRedirectPath, setupPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("garde les chemins internes", () => {
    expect(safeRedirectPath("/app/churn?periode=30j")).toBe("/app/churn?periode=30j");
  });

  it.each([null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "refuse « %s » et renvoie vers la configuration",
    (path) => {
      expect(safeRedirectPath(path)).toBe("/configuration");
    },
  );
});

describe("setupPath", () => {
  it("transmet l'adresse du site à l'étape 0", () => {
    expect(setupPath("https://monsaas.fr")).toBe("/configuration?site=https%3A%2F%2Fmonsaas.fr");
    expect(setupPath(null)).toBe("/configuration");
  });
});
