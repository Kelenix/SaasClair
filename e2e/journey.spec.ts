import { expect, test } from "@playwright/test";

// Le parcours de CLAUDE.md §7 : site vitrine → inscription → configuration en 2 actions → tableau
// de bord, sans rupture. Chaque exécution crée un compte de test local, jamais réutilisé.
test.use({
  storageState: { cookies: [], origins: [] },
  permissions: ["clipboard-read", "clipboard-write"],
});

test("de la page d'accueil au tableau de bord en 2 actions", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `parcours-${Date.now()}@test.saasclair.fr`;

  // Site vitrine : l'adresse saisie suit l'utilisateur jusqu'à la configuration.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByLabel("Adresse de votre SaaS").first().fill("example.com");
  await page
    .getByRole("button", { name: /Analyser mon SaaS/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/inscription\?site=/);

  // Inscription.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Email professionnel").fill(email);
  await page.getByLabel("Mot de passe").fill("Parcours-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });

  // Étape 0 : adresse reprise du site vitrine, analyse lancée seule, puis « Continuer ».
  await expect(page.getByRole("textbox", { name: "Adresse de votre SaaS" })).toHaveValue(
    /example\.com/,
  );
  await page.getByRole("button", { name: /Continuer/ }).click({ timeout: 30_000 });

  // Action 1 : copier la ligne de script ; la détection (simulée) passe seule à la suite.
  await page.getByRole("button", { name: "Copier" }).first().click();
  await expect(page.getByText("Script détecté. Première visite reçue.")).toBeVisible({
    timeout: 15_000,
  });

  // Action 2 : connecter Stripe.
  await page.getByRole("button", { name: "Connecter Stripe" }).click({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "C'est terminé." })).toBeVisible({
    timeout: 30_000,
  });

  // Tableau de bord personnalisé.
  await page.getByRole("button", { name: /Voir mon tableau de bord/ }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour Camille." })).toBeVisible();

  // Une fois configuré, on ne repasse plus par la configuration.
  await page.goto("/configuration");
  await expect(page).toHaveURL(/\/app$/);
});

test("chaque étape peut être passée, puis reprise depuis le bandeau du tableau de bord", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Email professionnel").fill(`passer-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill("Parcours-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });
  await expect(page.getByText(/données de démonstration/)).toHaveCount(0);

  // Les 3 étapes passées l'une après l'autre : arrivée sur le tableau de bord.
  const visibleTitle = page.locator("h1").filter({ visible: true }).first();
  for (const title of ["Installez le script.", "Connectez Stripe."]) {
    await page.getByRole("button", { name: "Passer cette étape" }).click();
    await expect(visibleTitle).toHaveText(title);
  }
  await page.getByRole("button", { name: "Passer cette étape" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
  const banner = page.getByRole("region", { name: "Configuration à terminer" });
  await expect(banner).toContainText("Plus que 3 étapes");

  // Reprise d'une étape précise ; ensuite /configuration seul ramène au tableau de bord.
  await banner.getByRole("link", { name: /Installer le script/ }).click();
  await expect(visibleTitle).toHaveText("Installez le script.", { timeout: 20_000 });
  await page.goto("/configuration");
  await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
});
