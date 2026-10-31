import { expect, test, type Page } from "@playwright/test";
import { ADMIN_ACCOUNT, DEMO_ACCOUNT } from "../e2e/helpers";

// Captures d'écran de la documentation, prises sur l'image de production locale (npm run up:prod)
// avec les comptes de démonstration : jamais de données réelles de clients.
const OUT = "docs-site/assets/captures";

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1440, height: 900 }, storageState: { cookies: [], origins: [] } });

async function shot(page: Page, name: string) {
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
}

async function signIn(page: Page, account: { email: string; password: string }) {
  await page.goto("/connexion", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mot de passe").fill(account.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => /^\/(app|admin)/.test(url.pathname), { timeout: 45_000 });
}

test("site vitrine et inscription", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await shot(page, "site-vitrine");
  await page.goto("/inscription?site=monsaas.fr", { waitUntil: "networkidle" });
  await shot(page, "inscription");
});

test("configuration (compte de documentation temporaire)", async ({ page }) => {
  await page.goto("/inscription?site=monsaas.fr", { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill("Nadia");
  await page
    .getByLabel("Email professionnel")
    .fill(`documentation-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill(`Doc-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Analyser" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "configuration");
});

test("tableau de bord de la cliente", async ({ page }) => {
  await signIn(page, DEMO_ACCOUNT);
  for (const [path, name] of [
    ["/app", "accueil"],
    ["/app/acquisition", "acquisition"],
    ["/app/tunnel", "tunnel"],
    ["/app/churn?client=lumen-bureau", "churn"],
    ["/app/revenus", "revenus"],
    ["/app/insights", "insights"],
  ]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await shot(page, name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app", { waitUntil: "networkidle" });
  await shot(page, "mobile");
});

test("espace super administrateur", async ({ page }) => {
  await signIn(page, ADMIN_ACCOUNT);
  await page.goto("/admin", { waitUntil: "networkidle" });
  await shot(page, "admin");
  await page.goto("/admin/utilisateurs?q=nadia@demo.saasclair.fr", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Nadia/ }).first().click();
  await shot(page, "admin-utilisateur");
  await page.goto("/admin/parametres", { waitUntil: "networkidle" });
  await shot(page, "admin-parametres");
  await page.goto("/admin/systeme", { waitUntil: "networkidle" });
  await shot(page, "admin-systeme");
});
