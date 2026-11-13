// Prénom déduit de l'email, pour une inscription en 2 champs (email, mot de passe).
// Prudence : seulement les formes claires « prenom.nom@ », « prenom_nom@ », « prenom-nom@ ».
// Sinon rien (« Bonjour. ») : mieux vaut pas de prénom qu'un prénom faux.

const GENERIC = new Set([
  "admin",
  "billing",
  "bonjour",
  "compta",
  "contact",
  "dev",
  "direction",
  "equipe",
  "facturation",
  "hello",
  "hi",
  "info",
  "infos",
  "jobs",
  "mail",
  "me",
  "noreply",
  "office",
  "rh",
  "sales",
  "support",
  "team",
  "tech",
  "vente",
  "ventes",
]);

export function firstNameFromEmail(email: string) {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const [first, second] = local.split(/[._+-]/);
  const isWord = (part: string | undefined) => Boolean(part && /^\p{L}{2,20}$/u.test(part));
  if (!isWord(first) || !isWord(second) || GENERIC.has(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}
