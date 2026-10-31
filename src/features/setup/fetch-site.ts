import "server-only";
import { lookup } from "node:dns/promises";
import { isPrivateAddress } from "./network-guard";
import { analyzeHomepage, UNREACHABLE_AUDIT, type SiteAudit } from "./site-analysis";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
  if (url.port && url.port !== "80" && url.port !== "443") throw new Error("port");
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("private");
  }
}

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel();
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Télécharge la page d'accueil (redirections vérifiées une à une) et l'analyse. */
export async function auditSite(siteUrl: string): Promise<SiteAudit> {
  const startedAt = performance.now();
  let url = new URL(siteUrl);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url);
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "User-Agent": "SaasClairBot/1.0 (+https://saasclair.fr)", Accept: "text/html" },
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        url = new URL(location, url);
        continue;
      }
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
        return UNREACHABLE_AUDIT;
      }
      const html = await readLimited(response);
      const headers = Object.fromEntries(response.headers.entries());
      return analyzeHomepage(
        html,
        url.toString(),
        headers,
        Math.round(performance.now() - startedAt),
      );
    }
  } catch {
    // Site injoignable, trop lent ou adresse interdite : l'utilisateur peut quand même continuer.
  }
  return UNREACHABLE_AUDIT;
}
