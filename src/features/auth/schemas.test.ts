import { describe, expect, it } from "vitest";
import { authErrorMessage, GENERIC_ERROR } from "./errors";
import { fieldErrorsOf, signInSchema, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  it("accepte une inscription complète et nettoie les espaces", () => {
    const result = signUpSchema.safeParse({
      firstName: "  Nadia ",
      email: " nadia@monsaas.fr ",
      password: "un-mot-de-passe",
    });
    expect(result.success && result.data).toEqual({
      firstName: "Nadia",
      email: "nadia@monsaas.fr",
      password: "un-mot-de-passe",
    });
  });

  it("explique chaque erreur en français, champ par champ", () => {
    const result = signUpSchema.safeParse({ firstName: "", email: "nadia@", password: "court" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsOf(result.error)).toEqual({
      firstName: "Comment devons-nous vous appeler ?",
      email: "Cette adresse semble incomplète. Vérifiez le @ et le domaine.",
      password: "Choisissez au moins 8 caractères.",
    });
  });
});

describe("signInSchema", () => {
  it("demande l'email avant de juger son format", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(!result.success && fieldErrorsOf(result.error)).toEqual({
      email: "Indiquez votre adresse email.",
      password: "Indiquez votre mot de passe.",
    });
  });
});

describe("authErrorMessage", () => {
  it("traduit les erreurs connues sans détail technique", () => {
    expect(authErrorMessage("invalid_credentials")).toMatch(/Email ou mot de passe incorrect/);
    expect(authErrorMessage("user_already_exists")).toMatch(/Connectez-vous plutôt/);
  });

  it("reste rassurant pour une erreur inconnue", () => {
    expect(authErrorMessage("unexpected_failure")).toBe(GENERIC_ERROR);
    expect(authErrorMessage(undefined)).toBe(GENERIC_ERROR);
  });
});
