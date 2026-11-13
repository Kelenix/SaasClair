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

// Session du compte de démonstration (projet « ordinateur ») : l'espace connecté est servi.
test.describe("politique de sécurité du contenu et session", () => {
  test("la CSP interdit les attributs d'événement, et l'espace connecté les outils publicitaires", async ({
    request,
  }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("object-src 'none'");
    const privateCsp = (await request.get("/app")).headers()["content-security-policy"] ?? "";
    expect(privateCsp).toContain("script-src-attr 'none'");
    expect(privateCsp).not.toContain("googletagmanager");
  });

  for (const path of ["/", "/connexion", "/app", "/app/revenus"]) {
    test(`${path} : aucune violation de la CSP`, async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (message) => {
        if (/Content Security Policy|Refused to/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      await page.goto(path, { waitUntil: "networkidle" });
      expect(violations).toEqual([]);
    });
  }

  test("la session est illisible par le JavaScript de la page (cookie httpOnly)", async ({
    context,
  }) => {
    const session = (await context.cookies()).filter((cookie) => cookie.name.startsWith("sb-"));
    expect(session.length).toBeGreaterThan(0);
    expect(session.every((cookie) => cookie.httpOnly)).toBe(true);
  });
});
