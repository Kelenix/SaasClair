export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Clé du projet SaasClair de l'éditeur : saasclair.com se mesure avec son propre script (public/s.js),
 * comme le site d'un client. Rien n'est envoyé depuis localhost ni par les robots de test.
 */
export const SELF_SITE_KEY = "6eead66e";
