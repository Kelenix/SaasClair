// Analyse d'une page d'accueil (fonctions pures, testées) : pages clés, référencement, technologies.

export type SiteAudit = {
  reachable: boolean;
  responseMs: number | null;
  speed: "rapide" | "correct" | "lent" | null;
  pageCount: number;
  pages: { signup: string | null; pricing: string | null; checkout: string | null };
  seo: { score: number; title: string | null; checks: SeoCheck[] };
  technologies: string[];
};

/** Un point de référencement ; `detail` dit ce qui a été trouvé et ce qu'il faut viser. */
export type SeoCheck = { label: string; ok: boolean; detail?: string };

export const PAGE_PATTERNS = {
  signup:
    /(sign-?up|register|inscription|creer-un-compte|create-account|get-started|essai|trial|start)/i,
  pricing: /(pricing|tarif|prix|plans?\b|price)/i,
  checkout:
    /(checkout|paiement|payment|billing|subscribe|abonnement|acheter|buy|cart|panier|checkout\.stripe\.com|buy\.stripe\.com|paddle|lemonsqueezy)/i,
} as const;

const TECHNOLOGIES: [string, RegExp][] = [
  ["WordPress", /wp-content|wp-includes/i],
  ["Webflow", /data-wf-site|webflow\.(js|css|com)/i],
  ["Shopify", /cdn\.shopify\.com|Shopify\.theme/i],
  ["Wix", /static\.wixstatic\.com|wix\.com/i],
  ["Framer", /framerusercontent\.com|framer\.com\/m\//i],
  ["Next.js", /\/_next\/|__NEXT_DATA__/],
  ["Nuxt", /\/_nuxt\/|__NUXT__/],
  ["Stripe", /js\.stripe\.com/i],
  ["Paddle", /cdn\.paddle\.com/i],
  ["Google Analytics", /googletagmanager\.com|google-analytics\.com/i],
  ["Plausible", /plausible\.io\/js/i],
  ["Intercom", /widget\.intercom\.io|intercomcdn/i],
  ["Crisp", /client\.crisp\.chat/i],
  ["HubSpot", /js\.hs-scripts\.com|hsforms/i],
];

const SPEED_THRESHOLDS = { rapide: 800, correct: 2000 } as const;

export const speedOf = (ms: number): SiteAudit["speed"] =>
  ms < SPEED_THRESHOLDS.rapide ? "rapide" : ms < SPEED_THRESHOLDS.correct ? "correct" : "lent";

const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const metaContent = (html: string, name: string) =>
  html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"))?.[1] ??
  null;

/** Liens de la page : adresse absolue (ancre comprise, « /#tarifs ») + texte visible. */
export function extractLinks(html: string, baseUrl: string) {
  const links: { href: string; text: string }[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (match[1].trim() === "#") continue;
    try {
      const href = new URL(match[1], baseUrl).toString();
      links.push({ href, text: decode(match[2].replace(/<[^>]+>/g, " ")) });
    } catch {
      // Lien mal formé : ignoré.
    }
  }
  return links;
}

/** Lien vers une section d'une page (« /#tarifs ») plutôt que vers une page. */
const isSection = (href: string) => href.includes("#");

/**
 * Repère inscription, tarifs et paiement d'après l'adresse et le texte des liens. Une section
 * « Tarifs » de l'accueil (« /#tarifs ») compte comme des tarifs visibles quand aucune page de
 * tarifs n'existe ; l'inscription et le paiement demandent une vraie page.
 */
export function detectPages(links: { href: string; text: string }[]) {
  const pages = links.filter(({ href }) => !isSection(href));
  const find = (pattern: RegExp, among = pages) =>
    among.find(
      ({ href, text }) => pattern.test(new URL(href).pathname + " " + text) || pattern.test(href),
    )?.href ?? null;
  return {
    signup: find(PAGE_PATTERNS.signup),
    pricing: find(PAGE_PATTERNS.pricing) ?? find(PAGE_PATTERNS.pricing, links),
    checkout: find(PAGE_PATTERNS.checkout),
  };
}

function detectTechnologies(html: string, headers: Record<string, string>) {
  const found = TECHNOLOGIES.filter(([, pattern]) => pattern.test(html)).map(([name]) => name);
  const generator = metaContent(html, "generator");
  if (generator && !found.some((name) => generator.toLowerCase().includes(name.toLowerCase()))) {
    found.unshift(generator.split(/\s/)[0]);
  }
  if (headers["cf-ray"]) found.push("Cloudflare");
  if (/vercel/i.test(headers.server ?? "")) found.push("Vercel");
  return [...new Set(found)].slice(0, 6);
}

export const TITLE_LENGTH = { min: 10, max: 70 } as const;
export const DESCRIPTION_LENGTH = { min: 50, max: 170 } as const;

const chars = (count: number) => `${count} caractère${count > 1 ? "s" : ""}`;

/** « 82 caractères : trop long (idéal : 10 à 70) ». */
function lengthDetail(length: number, range: { min: number; max: number }, missing: string) {
  if (!length) return missing;
  const ideal = `idéal : ${range.min} à ${range.max}`;
  if (length < range.min) return `${chars(length)} : trop court (${ideal})`;
  if (length > range.max) return `${chars(length)} : trop long (${ideal})`;
  return chars(length);
}

function seoChecks(html: string, url: string): SiteAudit["seo"] {
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle ? decode(rawTitle) : "";
  const description = decode(metaContent(html, "description") ?? "");
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  const inRange = (length: number, range: { min: number; max: number }) =>
    length >= range.min && length <= range.max;
  const checks: SeoCheck[] = [
    {
      label: "Titre de page",
      ok: inRange(title.length, TITLE_LENGTH),
      detail: lengthDetail(title.length, TITLE_LENGTH, "Aucun titre trouvé"),
    },
    {
      label: "Description",
      ok: inRange(description.length, DESCRIPTION_LENGTH),
      detail: lengthDetail(description.length, DESCRIPTION_LENGTH, "Aucune description trouvée"),
    },
    {
      label: "Un seul titre principal",
      ok: h1Count === 1,
      detail:
        h1Count === 1
          ? undefined
          : `${h1Count} titre${h1Count > 1 ? "s" : ""} principal (h1) : il en faut un seul`,
    },
    {
      label: "Adapté au mobile",
      ok: Boolean(metaContent(html, "viewport")),
      detail: metaContent(html, "viewport") ? undefined : "Balise « viewport » absente",
    },
    { label: "Connexion sécurisée", ok: url.startsWith("https://") },
    { label: "Langue déclarée", ok: /<html[^>]+lang=/i.test(html) },
  ];
  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);
  return { score, title: title || null, checks };
}

/** Audit complet à partir du HTML de la page d'accueil. */
export function analyzeHomepage(
  html: string,
  url: string,
  headers: Record<string, string>,
  responseMs: number,
): SiteAudit {
  const origin = new URL(url).origin;
  const links = extractLinks(html, url);
  const internalPages = new Set(
    links
      .filter(({ href }) => href.startsWith(origin) && !isSection(href))
      .map(({ href }) => new URL(href).pathname),
  );
  return {
    reachable: true,
    responseMs,
    speed: speedOf(responseMs),
    pageCount: internalPages.size,
    pages: detectPages(links),
    seo: seoChecks(html, url),
    technologies: detectTechnologies(html, headers),
  };
}

export const UNREACHABLE_AUDIT: SiteAudit = {
  reachable: false,
  responseMs: null,
  speed: null,
  pageCount: 0,
  pages: { signup: null, pricing: null, checkout: null },
  seo: { score: 0, title: null, checks: [] },
  technologies: [],
};
