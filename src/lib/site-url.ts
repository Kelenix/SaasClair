/**
 * Transforme ce que l'utilisateur tape (« monsaas.fr », « https://www.monsaas.fr/prix »)
 * en adresse de site normalisée (« https://www.monsaas.fr »), ou null si ce n'est pas un site.
 */
export function normalizeSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const isPublicHostname = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(url.hostname);
    return isPublicHostname ? url.origin : null;
  } catch {
    return null;
  }
}

/** Adresse affichée sans protocole : « monsaas.fr ». */
export const displaySiteUrl = (url: string) => url.replace(/^https?:\/\//, "");
