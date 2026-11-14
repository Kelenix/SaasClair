import { expect, test } from "@playwright/test";

// Google et GitHub démarrent par le serveur (auth/actions.ts, startOAuth). Non activés dans la
// CI : le serveur répond par un message clair, sans quitter la page.
test.use({ storageState: { cookies: [], origins: [] } });

for (const provider of ["Google", "GitHub"]) {
  test(`« Continuer avec ${provider} » passe par le serveur`, async ({ page }) => {
    await page.goto("/connexion", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: `Continuer avec ${provider}` }).click();
    await expect(page.getByText(`La connexion avec ${provider} arrive bientôt`)).toBeVisible();
    await expect(page).toHaveURL(/\/connexion$/);
  });
}
