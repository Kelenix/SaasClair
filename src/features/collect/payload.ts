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

/** Même site : même domaine, avec ou sans « www », ou l'un de ses sous-domaines. */
export function isSameSite(host: string, siteHost: string) {
  const a = bareHost(host);
  const b = bareHost(siteHost);
  return a === b || a.endsWith(`.${b}`);
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
 * Ligne à enregistrer, ou null si la visite est refusée : adresse invalide, page d'un autre site
 * que celui du projet, identification sans empreinte. Seul le chemin de la page est gardé : ses
 * paramètres peuvent contenir des données personnelles (emails, jetons).
 */
export function toEvent(payload: Payload, siteUrl: string | null): EventRow | null {
  const page = parseUrl(payload.u);
  if (!page) return null;
  if (siteUrl) {
    const site = parseUrl(siteUrl);
    if (!site || !isSameSite(page.hostname, site.hostname)) return null;
  }
  if (payload.t === "identify" && !payload.e) return null;

  const referrer = parseUrl(payload.r);
  const external = referrer && !isSameSite(referrer.hostname, page.hostname) ? referrer : null;
  const utmSource = param(page, "utm_source", 100);
  const utmMedium = param(page, "utm_medium", 100);

  return {
    type: payload.t,
    visitor_id: payload.v,
    path: (page.pathname || "/").slice(0, 512),
    referrer_host: external ? bareHost(external.hostname).slice(0, 255) : null,
    channel: classifyChannel({
      source: utmSource ?? undefined,
      medium: utmMedium ?? undefined,
      referrer: external?.href,
    }),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: param(page, "utm_campaign", 150),
    device: deviceOf(payload.w),
    email_hash: payload.t === "identify" ? (payload.e ?? null) : null,
  };
}
