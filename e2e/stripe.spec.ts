import { expect, test } from "@playwright/test";

// Connexion Stripe réelle (ADR-024), rejouée avec le Stripe simulé de la CI (/api/stripe-mock) :
// autorisation, retour, import en arrière-plan suivi à l'écran, puis Stripe marqué comme fait.
test.use({ storageState: { cookies: [], origins: [] } });

test("Stripe se connecte, ses données sont importées et l'étape est validée", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Email professionnel").fill(`stripe-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill("Stripe-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });

  // Adresse et script passés : on va droit à Stripe.
  for (const title of ["Installez le script.", "Connectez Stripe."]) {
    await page.getByRole("button", { name: "Passer cette étape" }).click();
    await expect(page.locator("h1").filter({ visible: true }).first()).toHaveText(title);
  }

  // Départ vers Stripe, autorisation, retour : l'import se suit à l'écran avec les vrais nombres.
  await page.getByRole("button", { name: "Connecter Stripe" }).click();
  await expect(page).toHaveURL(/stripe=ok/, { timeout: 30_000 });
  await expect(page.getByText(/Import terminé/)).toBeVisible({ timeout: 30_000 });
  const imported = page.locator("main");
  await expect(imported).toContainText("Clients");
  await expect(imported).toContainText("3");

  // Stripe est fait ; restent l'adresse et le script, rappelés par le tableau de bord.
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });
  const banner = page.getByRole("region", { name: "Configuration à terminer" });
  await expect(banner).toContainText("Plus que 2 étapes");
  await expect(banner).not.toContainText("Connecter Stripe");

  // Les écrans affichent les vraies données importées (Stripe simulé : 79 € + 758,40 € / an).
  // Next.js garde la page précédente cachée : seule la zone visible compte.
  const main = page.locator("main").filter({ visible: true });
  await expect(main).toContainText("Revenu mensuel récurrent");
  await expect(main).toContainText("Client test Beta");
  await page.goto("/app/revenus", { waitUntil: "networkidle" });
  await expect(main).toContainText(/Revenu mensuel récurrent : 142/);
  await expect(main).toContainText(/1 facture à récupérer/);
  await page.goto("/app/churn", { waitUntil: "networkidle" });
  await expect(main).toContainText("Client test Beta");
  await expect(main).toContainText("Résiliation programmée");
  await expect(main).toContainText("Paiement en retard");

  // Resynchronisation horaire : refusée sans le secret, acceptée avec, puis terminée ; l'écran
  // garde ses chiffres pendant l'import.
  expect((await page.request.post("/api/stripe/sync")).status()).toBe(401);
  const sync = await page.request.post("/api/stripe/sync", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? "cron_secret_local_test"}` },
  });
  expect(sync.status()).toBe(202);
  await page.reload({ waitUntil: "networkidle" });
  await expect(main).toContainText("Client test Beta");
  await expect
    .poll(async () => (await (await page.request.get("/api/stripe/status")).json()).status, {
      timeout: 30_000,
    })
    .toBe("done");
});

test("le Stripe simulé n'est jamais ouvert sans autorisation", async ({ request }) => {
  const response = await request.get("/api/stripe-mock/v1/customers");
  expect(response.status()).toBe(401);
});
