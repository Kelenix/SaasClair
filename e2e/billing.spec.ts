import { expect, test } from "@playwright/test";

// Paiement de l'abonnement SaasClair (ADR-027), rejoué avec le Stripe simulé : choix de l'offre,
// page de paiement, notification signée de Stripe, abonnement actif, portail client.
test.use({ storageState: { cookies: [], origins: [] } });

test("l'offre Growth annuelle se paie et l'abonnement devient actif", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Email professionnel").fill(`paiement-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill("Paiement-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });
  await page.getByRole("button", { name: /Terminer plus tard/ }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 30_000 });

  // Essai sans carte, puis choix de l'offre en annuel (prix HT exacts).
  await page.goto("/app/parametres?onglet=abonnement", { waitUntil: "networkidle" });
  const main = page.locator("main").filter({ visible: true });
  await expect(main).toContainText("Essai gratuit de l'offre Growth");
  await main.getByRole("button", { name: /Annuel/ }).click();
  await expect(main).toContainText(/191,90\s€ HT facturés une fois par an/);
  await main.getByRole("button", { name: "Choisir Growth" }).click();

  // Retour de Stripe : actif seulement une fois la notification signée reçue.
  await expect(page).toHaveURL(/paiement=ok/, { timeout: 30_000 });
  await expect(main).toContainText("Votre abonnement est actif", { timeout: 30_000 });
  await expect(main).toContainText("Growth · annuel");
  await expect(main).toContainText("Carte bancaire");

  // Portail client : changer d'offre ou de carte, factures, résiliation.
  await main.getByRole("button", { name: /Gérer mon abonnement/ }).click();
  await expect(page).toHaveURL(/portail=simule/, { timeout: 30_000 });
});

test("une notification non signée par Stripe est refusée", async ({ request }) => {
  const response = await request.post("/api/billing/webhook", {
    data: { id: "evt_faux", type: "customer.subscription.updated", data: { object: {} } },
  });
  expect(response.status()).toBe(400);
});
