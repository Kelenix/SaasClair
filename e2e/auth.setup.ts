import { expect, test as setup, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ADMIN_ACCOUNT, DEMO_ACCOUNT, totp } from "./helpers";

/** Clé de l'application d'authentification du super administrateur local (hors Git). */
const ADMIN_TOTP_FILE = "e2e/.auth/admin-totp.txt";

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
  // Double authentification exigée (lot A7) : base neuve, on relie l'application ; ensuite, le
  // code calculé avec la clé gardée de ce premier passage.
  await signIn(page, ADMIN_ACCOUNT, /\/double-authentification$/);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/Protégez l'administration|Entrez votre code/);
  let secret: string;
  if ((await heading.textContent())?.includes("Protégez")) {
    await page.getByRole("button", { name: "Activer la double authentification" }).click();
    secret = (await page.getByText(/^[A-Z2-7]{16,}$/).textContent())!.trim();
    writeFileSync(ADMIN_TOTP_FILE, secret);
  } else {
    if (!existsSync(ADMIN_TOTP_FILE)) {
      throw new Error(
        "Le super administrateur local a déjà une application reliée, sans clé connue : effacez-la (delete from auth.mfa_factors) puis relancez.",
      );
    }
    secret = readFileSync(ADMIN_TOTP_FILE, "utf8").trim();
  }
  // Un code qui change pendant la saisie : on attend le suivant plutôt que d'échouer.
  if (Date.now() % 30_000 > 25_000) await page.waitForTimeout(30_000 - (Date.now() % 30_000));
  await page.getByLabel("Code à 6 chiffres").fill(totp(secret));
  await page.getByRole("button", { name: /administration/ }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
