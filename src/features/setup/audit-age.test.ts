import { describe, expect, it } from "vitest";
import { auditAgeLabel, auditIsStale } from "./audit-age";
import { analyzeHomepage } from "./site-analysis";

const now = new Date("2026-11-13T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

describe("âge de l'analyse", () => {
  it("relancée au-delà de 6 heures, ou si la date est inconnue", () => {
    expect(auditIsStale(null, now)).toBe(true);
    expect(auditIsStale(ago(5 * 60), now)).toBe(false);
    expect(auditIsStale(ago(7 * 60), now)).toBe(true);
  });

  it("affichage lisible", () => {
    expect(auditAgeLabel(ago(0), now)).toBe("à l'instant");
    expect(auditAgeLabel(ago(5), now)).toBe("il y a 5 min");
    expect(auditAgeLabel(ago(180), now)).toBe("il y a 3 h");
    expect(auditAgeLabel(ago(3 * 24 * 60), now)).toBe("le 10 novembre");
  });
});

describe("détail des points de référencement", () => {
  const page = (head: string) =>
    analyzeHomepage(
      `<html lang="fr"><head>${head}</head><body><h1>X</h1></body></html>`,
      "https://x.fr/",
      {},
      300,
    );

  it("dit pourquoi le titre et la description ne vont pas", () => {
    const audit = page(
      `<title>${"T".repeat(82)}</title><meta name="description" content="Trop court">`,
    );
    const detail = (label: string) => audit.seo.checks.find((c) => c.label === label)?.detail;
    expect(detail("Titre de page")).toBe("82 caractères : trop long (idéal : 10 à 70)");
    expect(detail("Description")).toBe("10 caractères : trop court (idéal : 50 à 170)");
  });

  it("valide un titre et une description corrects, entités décodées", () => {
    const audit = page(
      `<title>MonSaaS &amp; vous</title><meta name="description" content="${"d".repeat(120)}">`,
    );
    expect(audit.seo.checks.slice(0, 2).map((c) => c.ok)).toEqual([true, true]);
    expect(audit.seo.title).toBe("MonSaaS & vous");
  });

  it("aucune description : on le dit", () => {
    const audit = page("<title>MonSaaS planning</title>");
    expect(audit.seo.checks[1].detail).toBe("Aucune description trouvée");
  });
});
