import { timingSafeEqual } from "node:crypto";

/** Cookie du jeton anti-falsification, entre le départ vers Stripe et le retour. */
export const STRIPE_STATE_COOKIE = "sc_stripe_state";

/** Résultat affiché par l'étape « Connecter Stripe » au retour (paramètre ?stripe=). */
export const STRIPE_RESULTS = ["ok", "refuse", "erreur", "indisponible", "deja-relie"] as const;
export type StripeResult = (typeof STRIPE_RESULTS)[number];

export const isStripeResult = (value: unknown): value is StripeResult =>
  STRIPE_RESULTS.includes(value as StripeResult);

/** Comparaison à durée constante : le jeton reçu est-il celui que nous avons émis ? */
export function sameState(expected: string | undefined, received: string | null) {
  if (!expected || !received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
