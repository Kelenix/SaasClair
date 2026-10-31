import { expect, test as setup, type Page } from "@playwright/test";
import { ADMIN_ACCOUNT, DEMO_ACCOUNT } from "./helpers";

async function signIn(page: Page, account: { email: string; password: string }, landing: RegExp) {
  // Attendre la fin du chargement : cliquer pendant l'hydratation ferait perdre la saisie.
  await page.goto("/connexion", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mot de passe").fill(account.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Premier passage : le serveur compile parfois la page d'arrivée, d'où le délai généreux.
  await expect(page).toHaveURL(landing, { timeout: 45_000 });
}

// Connexions uniques aux comptes de démonstration (supabase/seed*.sql), réutilisées par les tests.
setup("connexion au compte de démonstration", async ({ page }) => {
  await signIn(page, DEMO_ACCOUNT, /\/app$/);
  await page.context().storageState({ path: "e2e/.auth/nadia.json" });
});

setup("connexion au compte super administrateur", async ({ page }) => {
  await signIn(page, ADMIN_ACCOUNT, /\/admin$/);
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
