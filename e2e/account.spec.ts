import { expect, test } from "@playwright/test";

// Droit à l'effacement : l'utilisateur supprime lui-même son compte, depuis les paramètres.
test.use({ storageState: { cookies: [], origins: [] } });

test("un utilisateur supprime son compte, puis ne peut plus se connecter", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `suppression-${Date.now()}@test.saasclair.fr`;
  const password = "Suppression-2026!";
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });

  await page.goto("/app/parametres?onglet=confidentialite", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Supprimer mon compte" });
  // Tant que l'email n'est pas retapé, rien ne part.
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/tapez votre email/).fill(email);
  await confirm.click();

  await expect(page).toHaveURL(/\/connexion\?compte=supprime/, { timeout: 30_000 });
  await expect(page.getByRole("status")).toContainText("Votre compte est supprimé");

  // Le compte n'existe plus : la connexion est refusée.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/connexion/);
});
