import "server-only";
import { safeGet } from "./safe-get";
import { analyzeHomepage, UNREACHABLE_AUDIT, type SiteAudit } from "./site-analysis";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

export type Homepage = { html: string; url: string; headers: Record<string, string>; ms: number };

/**
 * Télécharge la page d'accueil, ou null si le site est injoignable, trop lent ou n'est pas une
 * page HTML. Chaque redirection est revérifiée, et l'adresse contrôlée est celle utilisée pour
 * se connecter (safe-get.ts) : pas d'accès possible au réseau interne du serveur.
 */
export async function fetchHomepage(siteUrl: string): Promise<Homepage | null> {
  const startedAt = performance.now();
  let url = new URL(siteUrl);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await safeGet(url, {
        timeoutMs: TIMEOUT_MS,
        maxBytes: MAX_BYTES,
        headers: {
          "User-Agent": "SaasClairBot/1.0 (+https://saasclair.com)",
          Accept: "text/html",
          // Toujours la version en ligne : une correction du titre doit se voir à la réanalyse.
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const location = response.headers.location;
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      if (
        response.status < 200 ||
        response.status >= 300 ||
        !response.headers["content-type"]?.includes("text/html")
      ) {
        return null;
      }
      return {
        html: response.body,
        url: url.toString(),
        headers: response.headers,
        ms: Math.round(performance.now() - startedAt),
      };
    }
  } catch {
    // Site injoignable, trop lent ou adresse interdite.
  }
  return null;
}

/** Télécharge la page d'accueil et l'analyse (l'utilisateur peut continuer même sans réponse). */
export async function auditSite(siteUrl: string): Promise<SiteAudit> {
  const page = await fetchHomepage(siteUrl);
  return page ? analyzeHomepage(page.html, page.url, page.headers, page.ms) : UNREACHABLE_AUDIT;
}
