import { z } from "zod";

// Schémas partagés : validation en temps réel dans le formulaire ET contrôle côté serveur.

export const PASSWORD_MIN_LENGTH = 8;

const email = z
  .string()
  .trim()
  .min(1, "Indiquez votre adresse email.")
  .pipe(z.email("Cette adresse semble incomplète. Vérifiez le @ et le domaine."));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Choisissez au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .max(72, "72 caractères au maximum.");

/** Inscription en 2 champs : le prénom est facultatif (déduit de l'email quand c'est sûr). */
export const signUpSchema = z.object({
  firstName: z.string().trim().max(40, "40 caractères au maximum.").default(""),
  email,
  password,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Indiquez votre mot de passe."),
});

export const resetRequestSchema = z.object({ email });

export const newPasswordSchema = z.object({ password });

export type FieldErrors = Partial<Record<string, string>>;

/** Premier message d'erreur par champ, prêt à afficher. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}
