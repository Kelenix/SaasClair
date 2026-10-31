const DEFAULT_PATH = "/configuration";

/**
 * N'autorise que les chemins internes (« /configuration?site=… ») comme destination après
 * connexion : bloque les redirections ouvertes vers un autre site (« //evil.com », « https:… »).
 */
export function safeRedirectPath(path: string | null | undefined, fallback = DEFAULT_PATH) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}

/** Chemin de la configuration, avec l'adresse du site saisie sur le site vitrine si elle existe. */
/** Ajoute le signal « inscription réussie », lu par la configuration pour la conversion. */
export const withWelcome = (path: string) => `${path}${path.includes("?") ? "&" : "?"}bienvenue=1`;

export const setupPath = (site?: string | null) =>
  site ? `${DEFAULT_PATH}?site=${encodeURIComponent(site)}` : DEFAULT_PATH;
