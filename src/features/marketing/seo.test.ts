import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { PLANS } from "./content";
import {
  AI_CRAWLERS,
  DEFINITION,
  homeStructuredData,
  jsonLd,
  llmsText,
  META_DESCRIPTION,
  PRIVATE_PATHS,
} from "./seo";

const faq = [
  { question: "Dois-je configurer quelque chose ?", answer: "Non. Deux actions suffisent." },
  { question: "Et si </script><b>?", answer: "Texte saisi dans l'administration." },
];

describe("robots", () => {
  const rules = [robots().rules].flat();

  it("ouvre les pages publiques aux robots des IA, nommés un par un", () => {
    const ai = rules.find((rule) => Array.isArray(rule.userAgent));
    expect(ai?.userAgent).toEqual(
      expect.arrayContaining(["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"]),
    );
    expect(ai?.allow).toBe("/");
  });

  it("chaque groupe garde les zones privées fermées (un robot nommé ignore « * »)", () => {
    for (const rule of rules) {
      expect(rule.disallow).toEqual(
        expect.arrayContaining(["/app", "/admin", "/api/", "/configuration"]),
      );
    }
    expect(PRIVATE_PATHS).not.toContain("/");
    expect(new Set(AI_CRAWLERS).size).toBe(AI_CRAWLERS.length);
  });
});

describe("données structurées de l'accueil", () => {
  const data = homeStructuredData({ faq, contactEmail: "bonjour@exemple.fr" });
  const byType = (type: string) => data["@graph"].find((node) => node["@type"] === type);

  it("éditeur, site, logiciel et questions, reliés entre eux", () => {
    expect(data["@graph"].map((node) => node["@type"])).toEqual([
      "Organization",
      "WebSite",
      "SoftwareApplication",
      "FAQPage",
    ]);
    expect(byType("SoftwareApplication")).toMatchObject({
      description: DEFINITION,
      publisher: { "@id": byType("Organization")?.["@id"] },
    });
  });

  it("une offre par tarif, au prix affiché sur le site", () => {
    const software = byType("SoftwareApplication") as unknown as { offers: { price: number }[] };
    const offers = software.offers;
    expect(offers.map((offer) => offer.price)).toEqual(PLANS.map((plan) => plan.monthly));
  });

  it("sans FAQ publiée : pas de bloc de questions vide", () => {
    const empty = homeStructuredData({ faq: [], contactEmail: null });
    expect(empty["@graph"].map((node) => node["@type"])).not.toContain("FAQPage");
    expect(empty["@graph"][0]).not.toHaveProperty("email");
  });

  it("un texte de la FAQ ne peut pas fermer la balise <script>", () => {
    const html = jsonLd(data);
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html)).toEqual(data);
  });
});

describe("llms.txt", () => {
  it("dit ce qu'est SaasClair, ses tarifs et ses réponses aux questions, en Markdown", () => {
    const text = llmsText({ faq, about: "Né chez Kelenix Tech." });
    expect(text.startsWith(`# SaasClair\n\n> ${DEFINITION}`)).toBe(true);
    for (const plan of PLANS) expect(text).toContain(`**${plan.name}**`);
    expect(text).toContain(
      "### Dois-je configurer quelque chose ?\n\nNon. Deux actions suffisent.",
    );
    expect(text).toContain("## À propos\n\nNé chez Kelenix Tech.");
    expect(text).toContain("sans carte bancaire");
  });

  it("sans FAQ ni page À propos : aucune section vide", () => {
    const text = llmsText({ faq: [], about: null });
    expect(text).not.toContain("## Questions fréquentes");
    expect(text).not.toContain("À propos");
  });
});

it("description de 50 à 170 caractères (le même seuil que notre propre audit)", () => {
  expect(META_DESCRIPTION.length).toBeGreaterThanOrEqual(50);
  expect(META_DESCRIPTION.length).toBeLessThanOrEqual(170);
});
