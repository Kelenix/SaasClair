import { describe, expect, it } from "vitest";
import { firstNameFromEmail } from "./first-name";

describe("firstNameFromEmail", () => {
  it.each([
    ["nadia.martin@monsaas.fr", "Nadia"],
    ["camille_durand@x.fr", "Camille"],
    ["Élodie-Roux@x.fr", "Élodie"],
    ["camille.martin+essai@x.fr", "Camille"],
  ])("%s → %s", (email, name) => {
    expect(firstNameFromEmail(email)).toBe(name);
  });

  it.each(["jdupont@x.fr", "contact.pro@x.fr", "parcours-1731500000@x.fr", "a.b@x.fr", "x@y"])(
    "%s → rien (pas de prénom faux)",
    (email) => {
      expect(firstNameFromEmail(email)).toBe("");
    },
  );
});
