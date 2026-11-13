// « C'est fait, vérifier mon site » (fonctions pures, testées) : la ligne SaasClair est-elle sur
// la page d'accueil, avec la bonne clé ? Un diagnostic clair plutôt qu'une attente sans fin.

export type InstallStatus = "ok" | "wrong_key" | "missing" | "unreachable";

export type InstallCheck = { status: InstallStatus; foundKey: string | null };

/** Cherche la balise <script> de SaasClair (s.js) et sa clé `data-site`. */
export function checkInstall(html: string | null, siteKey: string): InstallCheck {
  if (html === null) return { status: "unreachable", foundKey: null };
  const tags = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\/s\.js\b/i.test(tag) && /saasclair|data-site/i.test(tag));
  if (!tags.length) return { status: "missing", foundKey: null };
  const keys = tags.map((tag) => tag.match(/data-site=["']?([0-9a-f]{8})/i)?.[1]?.toLowerCase());
  if (keys.includes(siteKey.toLowerCase())) return { status: "ok", foundKey: siteKey };
  return { status: "wrong_key", foundKey: keys.find(Boolean) ?? null };
}

/** Ce qu'on dit à l'utilisateur, sans jargon, avec la marche à suivre. */
export const INSTALL_MESSAGES: Record<InstallStatus, string> = {
  ok: "C'est bon : la ligne SaasClair est bien sur votre site. Vos visites arrivent dès maintenant.",
  wrong_key:
    "Une ligne SaasClair est sur votre site, mais avec une autre clé. Remplacez-la par celle ci-dessus (bouton « Copier »).",
  missing:
    "La ligne n'est pas encore sur votre page d'accueil. Vérifiez qu'elle est enregistrée puis publiée (certains outils demandent de cliquer sur « Publier »), et réessayez. Ajoutée avec Google Tag Manager ? Ouvrez simplement votre site : la première visite la confirmera.",
  unreachable:
    "Votre site n'a pas répondu. Vérifiez qu'il est en ligne, puis réessayez dans un instant.",
};
