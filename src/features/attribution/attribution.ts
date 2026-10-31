import { z } from "zod";

// Provenance d'un visiteur au premier passage (« premier contact ») : gardée 30 jours dans un
// cookie interne au site, puis enregistrée sur le profil à l'inscription. Aucun traceur tiers.

export const ATTRIBUTION_COOKIE = "sc_provenance";
export const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60;

export const CHANNELS = [
  "seo",
  "ads",
  "linkedin",
  "instagram",
  "partners",
  "email",
  "referral",
  "direct",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  seo: "Recherche Google",
  ads: "Publicité",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  partners: "Partenaires",
  email: "Email",
  referral: "Autre site",
  direct: "Accès direct",
};

const text = (max: number) => z.string().trim().max(max).optional().catch(undefined);

const attributionSchema = z.object({
  channel: z.enum(CHANNELS).catch("direct"),
  source: text(100),
  medium: text(100),
  campaign: text(150),
  referrer: text(200),
  landing: text(200),
});
export type Attribution = z.infer<typeof attributionSchema>;

const has = (value: string | undefined, ...needles: string[]) =>
  Boolean(value && needles.some((needle) => value.includes(needle)));

/** Classe une visite dans un canal, à partir des paramètres UTM puis du site d'où elle vient. */
export function classifyChannel({
  source,
  medium,
  referrer,
}: {
  source?: string;
  medium?: string;
  referrer?: string;
}): Channel {
  const s = source?.toLowerCase();
  const m = medium?.toLowerCase();
  const host = referrer ? safeHost(referrer) : undefined;

  if (has(m, "cpc", "ppc", "paid", "ads", "display") || has(s, "adwords", "googleads"))
    return "ads";
  if (has(m, "email", "newsletter") || has(s, "newsletter", "mailchimp", "brevo")) return "email";
  if (has(s, "linkedin") || has(host, "linkedin.", "lnkd.in")) return "linkedin";
  if (has(s, "instagram", "facebook", "meta") || has(host, "instagram.", "facebook.")) {
    return "instagram";
  }
  if (has(m, "partner", "affiliate") || has(s, "partenaire", "partner")) return "partners";
  if (has(m, "organic") || has(host, "google.", "bing.", "duckduckgo.", "qwant.", "ecosia.")) {
    return "seo";
  }
  if (s || host) return "referral";
  return "direct";
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/** Lit la valeur du cookie (JSON encodé) ; toute valeur abîmée donne « accès direct ». */
export function parseAttribution(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    return attributionSchema.parse(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

/** Données transmises au compte à l'inscription (reprises par le profil). */
export const attributionMetadata = (attribution: Attribution | null) =>
  attribution
    ? {
        signup_channel: attribution.channel,
        signup_source: attribution.source,
        signup_medium: attribution.medium,
        signup_campaign: attribution.campaign,
        signup_referrer: attribution.referrer,
        signup_landing: attribution.landing,
      }
    : {};
