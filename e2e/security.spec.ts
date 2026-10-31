import { expect, test } from "@playwright/test";

test.describe("accès protégés", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // Non-régression : un envoi parti avant que React n'intercepte le formulaire se faisait en GET,
  // avec le mot de passe dans l'adresse (historique, journaux). Les formulaires sont en POST.
  for (const path of ["/connexion", "/inscription", "/mot-de-passe-oublie"]) {
    test(`${path} : le formulaire ne peut jamais partir en GET`, async ({ page }) => {
      await page.goto(path);
      const form = page.locator("main form");
      await expect(form).toHaveAttribute("method", "post");
    });
  }

  test("un visiteur non connecté est renvoyé vers la connexion", async ({ page }) => {
    for (const path of ["/app", "/app/churn", "/app/parametres", "/configuration"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/connexion/);
    }
  });

  test("les en-têtes de sécurité sont présents", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
