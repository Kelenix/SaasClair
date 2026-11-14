// Référencement classique et dans les assistants IA (ChatGPT, Gemini, Claude, Perplexity…) :
// règles des robots, données structurées et fichier llms.txt, tirés des mêmes textes que le site.

import { PLANS, PROMISES, SETUP_STEPS } from "./content";
import { ANNUAL_DISCOUNT, TRIAL_DAYS } from "@/features/billing/plans";
import { SITE_URL } from "@/lib/site";

export const BRAND = "SaasClair";
export const PUBLISHER = "Kelenix Tech";

/** Ce qu'est SaasClair, en une phrase qu'un assistant IA peut reprendre telle quelle. */
export const DEFINITION =
  "SaasClair est un outil d'analyse pour les créateurs de SaaS, sans configuration : il relie chaque client payant Stripe au canal qui l'a amené, montre où les visiteurs abandonnent avant d'acheter et signale les clients qui risquent de partir.";

/** Description courte (balise meta, 50 à 170 caractères). */
export const META_DESCRIPTION =
  "Outil d'analyse pour SaaS, sans configuration : d'où viennent vos clients, pourquoi vos visiteurs n'achètent pas et qui risque de partir.";

/** Zones privées : jamais explorées, quel que soit le robot. */
export const PRIVATE_PATHS = [
  "/app",
  "/admin",
  "/api/",
  "/auth/",
  "/configuration",
  "/design",
  "/double-authentification",
  "/mot-de-passe-oublie",
  "/nouveau-mot-de-passe",
];

/**
 * Robots des assistants IA, nommés un par un : la recherche (réponses avec liens) comme
 * l'apprentissage (ce que les modèles savent de SaasClair). Tous sont les bienvenus.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "Google-Extended",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot-Extended",
  "Amazonbot",
  "meta-externalagent",
  "MistralAI-User",
  "DuckAssistBot",
  "CCBot",
];

export type FaqEntry = { question: string; answer: string };

const price = (value: number) => value.toLocaleString("fr-FR", { minimumFractionDigits: 2 });

/** Données structurées de l'accueil (schema.org) : éditeur, site, logiciel et questions. */
export function homeStructuredData({
  faq,
  contactEmail,
}: {
  faq: FaqEntry[];
  contactEmail: string | null;
}) {
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organisation`,
    name: BRAND,
    legalName: PUBLISHER,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    ...(contactEmail ? { email: contactEmail } : {}),
  };
  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    name: BRAND,
    url: SITE_URL,
    inLanguage: "fr-FR",
    publisher: { "@id": organization["@id"] },
  };
  const software = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#logiciel`,
    name: BRAND,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image.png`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Analyse pour SaaS",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    description: DEFINITION,
    featureList: [
      ...PROMISES.map((promise) => `${promise.title} : ${promise.text}`),
      "Installation en deux actions : une ligne de code sur le site, puis la connexion à Stripe.",
      "Stripe est seulement lu : rien n'est jamais modifié.",
    ],
    publisher: { "@id": organization["@id"] },
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: `${plan.pitch} ${price(plan.monthly)} € HT par mois, essai gratuit de ${TRIAL_DAYS} jours sans carte bancaire.`,
      price: plan.monthly,
      priceCurrency: "EUR",
      url: `${SITE_URL}/#tarifs`,
      availability: "https://schema.org/InStock",
    })),
  };
  const questions = faq.length
    ? [
        {
          "@type": "FAQPage",
          "@id": `${SITE_URL}/#questions`,
          inLanguage: "fr-FR",
          mainEntity: faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        },
      ]
    : [];
  return {
    "@context": "https://schema.org",
    "@graph": [organization, website, software, ...questions],
  };
}

/**
 * JSON prêt à placer dans une balise <script> : « < » échappé, pour qu'un texte saisi dans
 * l'administration (FAQ) ne puisse jamais fermer la balise.
 */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Fichier llms.txt (https://llmstxt.org) : SaasClair résumé pour les assistants IA. */
export function llmsText({ faq, about }: { faq: FaqEntry[]; about: string | null }) {
  const lines = [
    `# ${BRAND}`,
    "",
    `> ${DEFINITION}`,
    "",
    "Pour qui : les fondateurs et petites équipes de SaaS B2B, souvent sans analyste, qui veulent des réponses en euros plutôt que des tableaux à régler. Interface en français. Données hébergées en Europe (Allemagne).",
    "",
    "## Ce que SaasClair répond",
    "",
    ...PROMISES.map((promise) => `- **${promise.title}** : ${promise.text}`),
    "",
    "## Mise en place (moins de 5 minutes)",
    "",
    ...SETUP_STEPS.map(
      (step, index) =>
        `${index + 1}. **${step.title}** (${step.duration.toLowerCase()}) : ${step.text}`,
    ),
    "",
    "Aucun réglage obligatoire ensuite. Quand l'outil a un doute, il pose une question fermée, à laquelle on répond en un clic.",
    "",
    "## Tarifs",
    "",
    `Essai gratuit de ${TRIAL_DAYS} jours sur chaque offre, sans carte bancaire. Prix hors taxes, par mois ; ${ANNUAL_DISCOUNT * 100} % de remise en payant à l'année.`,
    "",
    ...PLANS.map(
      (plan) =>
        `- **${plan.name}** : ${price(plan.monthly)} € par mois. ${plan.pitch} ${plan.features.join(" ; ")}.`,
    ),
  ];
  if (faq.length) {
    lines.push(
      "",
      "## Questions fréquentes",
      "",
      ...faq.flatMap((item) => [`### ${item.question}`, "", item.answer, ""]),
    );
  }
  if (about) lines.push("", "## À propos", "", about);
  lines.push(
    "",
    "## Liens",
    "",
    `- [Accueil, fonctionnalités et tarifs](${SITE_URL}/)`,
    `- [Essai gratuit de ${TRIAL_DAYS} jours](${SITE_URL}/inscription)`,
    ...(about ? [`- [À propos](${SITE_URL}/a-propos)`] : []),
    `- [Politique de confidentialité](${SITE_URL}/confidentialite)`,
    `- [Mentions légales](${SITE_URL}/mentions-legales)`,
    "",
    `Éditeur : ${PUBLISHER}.`,
  );
  return `${lines.join("\n").trim()}\n`;
}
