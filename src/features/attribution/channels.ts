// Canaux d'acquisition et classement d'une visite. Aucune dépendance : ce fichier part dans le
// navigateur avec le site vitrine (AttributionTracker), qui reste ainsi léger.

export const ATTRIBUTION_COOKIE = "sc_provenance";
export const ATTRIBUTION_MAX_AGE = 30 * 24 * 60 * 60;

export const CHANNELS = [
  "seo",
  "ads",
  "linkedin",
  "instagram",
  "social",
  "ai",
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
  instagram: "Facebook et Instagram",
  social: "Autres réseaux sociaux",
  ai: "Assistants IA",
  partners: "Partenaires",
  email: "Email",
  referral: "Autre site",
  direct: "Accès direct",
};

const has = (value: string | undefined, ...needles: string[]) =>
  Boolean(value && needles.some((needle) => value.includes(needle)));

/** Le site (ou l'un de ses sous-domaines) : « x.com » reconnaît x.com et www.x.com, pas box.com. */
const isHost = (host: string | undefined, ...domains: string[]) =>
  Boolean(host && domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));

// Sites classés par canal (le site d'où vient la visite).
const WEBMAIL = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "mail.proton.me",
  "webmail.orange.fr",
  "mail.orange.fr",
  "webmail.free.fr",
  "zimbra.free.fr",
  "webmail.sfr.fr",
  "laposte.net",
  "mail.ovh.net",
];
const AI = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "chat.mistral.ai",
  "you.com",
  "phind.com",
];
const SOCIAL = [
  "t.co",
  "x.com",
  "twitter.com",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "tiktok.com",
  "pinterest.com",
  "threads.net",
  "bsky.app",
  "mastodon.social",
  "news.ycombinator.com",
  "producthunt.com",
  "medium.com",
  "substack.com",
];
const META = ["facebook.com", "fb.com", "instagram.com", "l.facebook.com", "lm.facebook.com"];
const SEARCH = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "qwant.com",
  "ecosia.org",
  "search.yahoo.com",
  "yandex.com",
  "search.brave.com",
  "startpage.com",
];
/** Moteurs de recherche par pays : google.fr, google.co.uk, bing.fr… */
const isSearch = (host: string | undefined) =>
  isHost(host, ...SEARCH) || Boolean(host && /(^|\.)(google|bing|yahoo)\.[a-z.]{2,6}$/.test(host));

/**
 * Classe une visite dans un canal : paramètres UTM et identifiants de clic publicitaires, puis
 * le site d'où elle vient. L'ordre compte : la messagerie et les assistants IA de Google ou de
 * Microsoft ne sont pas de la recherche.
 */
export function classifyChannel({
  source,
  medium,
  referrer,
  clickIds = [],
}: {
  source?: string;
  medium?: string;
  referrer?: string;
  /** Paramètres de clic présents dans l'adresse (gclid, fbclid, msclkid…). */
  clickIds?: string[];
}): Channel {
  const s = source?.toLowerCase();
  const m = medium?.toLowerCase();
  const host = referrer ? safeHost(referrer) : undefined;
  const clicks = new Set(clickIds.map((id) => id.toLowerCase()));

  if (has(m, "cpc", "ppc", "paid", "ads", "display") || has(s, "adwords", "googleads"))
    return "ads";
  // Clic sur une annonce Google, Microsoft, TikTok ou LinkedIn (sans paramètres UTM).
  if (["gclid", "gbraid", "wbraid", "dclid", "msclkid", "ttclid"].some((id) => clicks.has(id))) {
    return "ads";
  }
  if (has(m, "email", "newsletter") || has(s, "newsletter", "mailchimp", "brevo")) return "email";
  if (isHost(host, ...WEBMAIL) || Boolean(host && /^(web)?mail\./.test(host))) return "email";
  if (has(s, "chatgpt", "openai", "perplexity", "claude", "gemini", "copilot")) return "ai";
  if (isHost(host, ...AI)) return "ai";
  if (has(s, "linkedin") || clicks.has("li_fat_id") || isHost(host, "linkedin.com", "lnkd.in")) {
    return "linkedin";
  }
  // fbclid : lien partagé sur Facebook ou Instagram, publicité ou non.
  if (has(s, "instagram", "facebook", "meta") || clicks.has("fbclid") || isHost(host, ...META)) {
    return "instagram";
  }
  if (
    has(s, "twitter", "youtube", "reddit", "tiktok", "pinterest") ||
    s === "x" ||
    isHost(host, ...SOCIAL)
  ) {
    return "social";
  }
  if (has(m, "partner", "affiliate") || has(s, "partenaire", "partner")) return "partners";
  if (has(m, "organic") || isSearch(host)) return "seo";
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
