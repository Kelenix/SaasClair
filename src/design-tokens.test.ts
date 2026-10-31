import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vérifie les contrastes directement sur les jetons de globals.css (source unique).
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"));
  if (!match) throw new Error(`Jeton --${name} introuvable`);
  return match[1];
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const AA_TEXT = 4.5;

describe("jetons de couleur", () => {
  it("reprend les couleurs du brand kit", () => {
    expect(token("forest")).toBe("#064e3b");
    expect(token("emerald")).toBe("#10b981");
    expect(token("gold")).toBe("#f5b700");
    expect(token("cream")).toBe("#faf7f0");
  });

  it.each([
    ["ink", "cream"],
    ["slate", "cream"],
    ["slate", "white"],
    ["forest", "cream"],
    ["cream", "forest"],
    ["emerald-ink", "cream"],
    ["emerald-ink", "emerald-tint"],
    ["gold-ink", "gold-tint"],
    ["gold-ink", "white"],
    ["danger", "white"],
    ["danger", "danger-tint"],
    ["forest-deep", "emerald"],
  ])("%s sur %s respecte le contraste AA", (text, background) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("n'utilise jamais l'émeraude pure pour du texte sur fond clair", () => {
    expect(contrast("emerald", "cream")).toBeLessThan(AA_TEXT);
  });
});
