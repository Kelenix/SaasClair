import { z } from "zod";
import { classifyChannel, type Channel } from "@/features/attribution/attribution";

// Ce que le script de collecte (public/s.js) envoie à chaque page vue, et la ligne enregistrée.
// Noms courts : le message part à chaque page de chaque site client.

export const MAX_PAYLOAD_BYTES = 4096;

const payloadSchema = z.object({
  /** Clé du site (ligne de script). */
  s: z.string().regex(/^[0-9a-f]{8}$/),
  t: z.enum(["pageview", "identify"]),
  /** Adresse de la page. */
  u: z.string().max(2048),
  /** Page précédente (site d'origine). */
  r: z.string().max(2048).optional(),
  /** Identifiant aléatoire du visiteur. */
  v: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  /** Largeur d'écran. */
  w: z.number().int().min(0).max(20_000).optional(),
  /** Empreinte SHA-256 de l'email (identification d'un inscrit). */
  e: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
});
export type Payload = z.infer<typeof payloadSchema>;

export type Device = "mobile" | "tablet" | "desktop";

export type EventRow = {
  type: Payload["t"];
  visitor_id: string;
  path: string;
  referrer_host: string | null;
  channel: Channel;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device: Device | null;
  email_hash: string | null;
};

export function parsePayload(raw: string): Payload | null {
  if (raw.length > MAX_PAYLOAD_BYTES) return null;
  try {
    const result = payloadSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const parseUrl = (value: string | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
};

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** Suffixes à deux niveaux courants : le domaine de « app.monsaas.co.uk » est monsaas.co.uk. */
const TWO_LEVEL_SUFFIX =
  /\.(co|com|org|net|gov|ac|edu)\.(uk|jp|au|nz|br|za|in|il|kr|tr|mx|ar|sg|hk|tw)$|\.(gouv|asso)\.fr$/;

/** Hébergeurs partagés : chaque sous-domaine est le site d'un client différent. */
const SHARED_HOSTS = [
  "vercel.app",
  "netlify.app",
  "github.io",
  "pages.dev",
  "herokuapp.com",
  "onrender.com",
  "webflow.io",
  "framer.website",
  "framer.app",
  "wixsite.com",
  "myshopify.com",
  "bubbleapps.io",
  "web.app",
  "firebaseapp.com",
  "azurewebsites.net",
  "fly.dev",
  "railway.app",
  "replit.app",
  "carrd.co",
];

/** Domaine du site, sans ses sous-domaines (www, app, blog…). */
export function rootDomain(host: string) {
  const bare = bareHost(host);
  // Adresse IP : prise telle quelle.
  if (/^[\d.]+$/.test(bare) || bare.includes(":")) return bare;
  const labels = bare.split(".");
  const shared = SHARED_HOSTS.find((suffix) => bare.endsWith(`.${suffix}`));
  const keep = shared ? shared.split(".").length + 1 : TWO_LEVEL_SUFFIX.test(bare) ? 3 : 2;
  return labels.slice(-keep).join(".");
}

/**
 * Même site : même domaine, quel que soit le sous-domaine. Le site vitrine (www.monsaas.fr) et
 * l'application (app.monsaas.fr) sont un seul et même site, dans les deux sens.
 */
export function isSameSite(host: string, siteHost: string) {
  return rootDomain(host) === rootDomain(siteHost);
}

export function deviceOf(width: number | undefined): Device | null {
  if (!width) return null;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const param = (url: URL, name: string, max: number) =>
  url.searchParams.get(name)?.trim().slice(0, max) || null;

/**
 * Chemin de la page. Les applications qui changent de page par l'ancre (« #/tarifs ») gardent
 * leur route ; une simple ancre de section (« #faq ») est ignorée.
 */
export function pathOfPage(page: URL) {
  const route = /^#!?(\/[^?#]*)/.exec(page.hash)?.[1];
  const base = page.pathname || "/";
  const path = route ? `${base.replace(/\/$/, "")}${route}` : base;
  return path.slice(0, 512);
}

/**
 * Ligne à enregistrer, ou null si la visite est refusée : adresse invalide, page d'un autre site
 * que celui du projet, identification sans empreinte. Seul le chemin de la page est gardé : ses
 * paramètres peuvent contenir des données personnelles (emails, jetons).
 */
export function toEvent(payload: Payload, siteUrl: string | null): EventRow | null {
  const page = parseUrl(payload.u);
  if (!page) return null;
  const site = siteUrl ? parseUrl(siteUrl) : null;
  if (siteUrl && (!site || !isSameSite(page.hostname, site.hostname))) return null;
  if (payload.t === "identify" && !payload.e) return null;

  // Provenance externe seulement : un passage de www.monsaas.fr à app.monsaas.fr reste interne.
  const referrer = parseUrl(payload.r);
  const internal = (host: string) =>
    isSameSite(host, page.hostname) || (site !== null && isSameSite(host, site.hostname));
  const external = referrer && !internal(referrer.hostname) ? referrer : null;
  const utmSource = param(page, "utm_source", 100);
  const utmMedium = param(page, "utm_medium", 100);

  return {
    type: payload.t,
    visitor_id: payload.v,
    path: pathOfPage(page),
    referrer_host: external ? bareHost(external.hostname).slice(0, 255) : null,
    channel: classifyChannel({
      source: utmSource ?? undefined,
      medium: utmMedium ?? undefined,
      referrer: external?.href,
      clickIds: [...page.searchParams.keys()],
    }),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: param(page, "utm_campaign", 150),
    device: deviceOf(payload.w),
    email_hash: payload.t === "identify" ? (payload.e ?? null) : null,
  };
}
