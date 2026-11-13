const DEFAULT_PATH = "/configuration";
const INTERNAL = "https://interne.invalid";
// Caractères de contrôle (tabulation, retour à la ligne…) et barre inverse.
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

/**
 * N'autorise que les chemins internes (« /configuration?site=… ») comme destination après
 * connexion : bloque les redirections ouvertes vers un autre site (« //evil.com », « https:… »).
 */
export function safeRedirectPath(path: string | null | undefined, fallback = DEFAULT_PATH) {
  // Caractères de contrôle et barres inverses : les navigateurs les retirent ou les changent en
  // « / », si bien que « /<tabulation>/evil.com » devient « //evil.com », un autre site.
  if (!path || !path.startsWith("/") || CONTROL_OR_BACKSLASH.test(path)) return fallback;
  try {
    const url = new URL(path, INTERNAL);
    return url.origin === INTERNAL ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}

/** Ajoute le signal « inscription réussie », lu par la configuration pour la conversion. */
export const withWelcome = (path: string) => `${path}${path.includes("?") ? "&" : "?"}bienvenue=1`;

/** Chemin de la configuration, avec l'adresse du site saisie sur le site vitrine si elle existe. */
export const setupPath = (site?: string | null) =>
  site ? `${DEFAULT_PATH}?site=${encodeURIComponent(site)}` : DEFAULT_PATH;
