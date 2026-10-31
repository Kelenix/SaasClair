import { expect, test } from "@playwright/test";
import {
  ADMIN_PAGES,
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  revealWholePage,
} from "./helpers";

test.describe("accès à l'espace administrateur", () => {
  test("un client est renvoyé vers son tableau de bord", async ({ page }) => {
    // Projet « ordinateur » : session du compte client de démonstration.
    for (const path of ["/admin", "/admin/utilisateurs", "/admin/parametres"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/app$/);
    }
  });

  test("un visiteur ne peut pas exporter la newsletter", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const response = await context.request.get("/admin/newsletter/export", { maxRedirects: 0 });
    expect([302, 303, 307, 403]).toContain(response.status());
    await context.close();
  });
});

test.describe("super administrateur", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  for (const path of ADMIN_PAGES) {
    test(`${path} est accessible et ne déborde pas`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await revealWholePage(page);
      await expectNoA11yViolations(page);
      await expectNoHorizontalScroll(page);
    });
  }

  test("le tableau de bord et la liste des utilisateurs reflètent la base", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Pilotage de SaasClair" })).toBeVisible();
    await expect(page.getByText("Recherche Google").first()).toBeVisible();

    await page.goto("/admin/utilisateurs?q=nadia@demo.saasclair.fr");
    await expect(page.getByRole("status").filter({ hasText: /^1 utilisateur/ })).toBeVisible();
    await page.getByRole("button", { name: /Nadia/ }).first().click();
    await expect(page.getByRole("dialog").getByText("Provenance")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("LinkedIn", { exact: true })).toBeVisible();
  });

  test("une question ajoutée à la FAQ apparaît sur le site, puis disparaît", async ({ page }) => {
    const question = `Question de test ${Date.now()} ?`;
    await page.goto("/admin/faq");
    await page.getByRole("button", { name: "Ajouter une question" }).click();
    const editor = page.getByRole("dialog");
    await editor.getByRole("textbox", { name: /^Question/ }).fill(question);
    await editor
      .getByRole("textbox", { name: /^Réponse/ })
      .fill("Réponse de test, supprimée à la fin du test.");
    await editor.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(question)).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("button", { name: question })).toBeVisible();

    await page.goto("/admin/faq");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Supprimer : ${question}` }).click();
    await expect(page.getByText(question)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("button", { name: question })).toHaveCount(0);
  });

  test("une inscription à la newsletter arrive dans l'espace administrateur", async ({ page }) => {
    const email = `lecteur-${Date.now()}@test.saasclair.fr`;
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByLabel("Votre email").fill(email);
    await page.getByRole("button", { name: "S'inscrire" }).click();
    await expect(page.getByText("C'est noté.")).toBeVisible();

    await page.goto("/admin/newsletter");
    await page.getByLabel("Rechercher un abonné").fill(email);
    await expect(page.getByText(email)).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Supprimer ${email}` }).click();
    await expect(page.getByText(email)).toHaveCount(0);
  });
});
