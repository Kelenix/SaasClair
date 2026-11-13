import { expect, test } from "@playwright/test";

// Compte neuf : la déconnexion ferme toutes les sessions du compte, celle du compte de
// démonstration (partagée par les autres tests) doit rester ouverte.
test.use({ storageState: { cookies: [], origins: [] } });

test("la déconnexion ramène à la page d'accueil, session fermée", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page
    .getByLabel("Email", { exact: true })
    .fill(`deconnexion-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill("Deconnexion-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Plus de session : l'espace connecté renvoie vers la connexion.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/connexion/);
});
