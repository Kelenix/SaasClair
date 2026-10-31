import { describe, expect, it } from "vitest";
import { formatEuro, formatNumber, formatPercent } from "./format";

// Intl fr-FR sépare les milliers par une espace fine insécable (U+202F).
const normalize = (text: string) => text.replace(/[  ]/g, " ");

describe("formats français", () => {
  it("affiche les euros sans décimales", () => {
    expect(normalize(formatEuro(25000))).toBe("25 000 €");
    expect(normalize(formatEuro(1749.6))).toBe("1 750 €");
  });

  it("affiche les pourcentages avec une virgule", () => {
    expect(normalize(formatPercent(7))).toBe("7,0 %");
    expect(normalize(formatPercent(18.44))).toBe("18,4 %");
  });

  it("arrondit les nombres", () => {
    expect(normalize(formatNumber(339.7))).toBe("340");
  });
});
