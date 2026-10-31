import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Compte de démonstration local, créé par supabase/seed.sql (surchargeable par variables d'environnement). */
export const DEMO_ACCOUNT = {
  email: process.env.E2E_EMAIL ?? "nadia@demo.saasclair.fr",
  password: process.env.E2E_PASSWORD ?? "Demo-SaasClair-2026",
};

/** Super administrateur de démonstration local (supabase/seed-admin.sql). */
export const ADMIN_ACCOUNT = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@demo.saasclair.fr",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Admin-SaasClair-2026",
};

export const PUBLIC_PAGES = [
  "/",
  "/a-propos",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
];
export const ADMIN_PAGES = [
  "/admin",
  "/admin/utilisateurs",
  "/admin/abonnements",
  "/admin/newsletter",
  "/admin/temoignages",
  "/admin/faq",
  "/admin/a-propos",
  "/admin/parametres",
  "/admin/systeme",
];
export const DASHBOARD_PAGES = [
  "/app",
  "/app/acquisition",
  "/app/tunnel",
  "/app/churn",
  "/app/revenus",
  "/app/insights",
  "/app/parametres",
];

/** Fait défiler toute la page pour déclencher les apparitions au défilement, puis revient en haut. */
export async function revealWholePage(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  // Les révélations de données durent jusqu'à 1,2 s.
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Aucune violation WCAG 2.1 A / AA détectée par axe-core. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Les toasts apparaissent et disparaissent seuls : hors de l'analyse.
    .exclude("[data-sonner-toaster]")
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}) : ${violation.nodes
        .slice(0, 3)
        .map((node) => `${node.target.join(" ")} [${node.any[0]?.message ?? ""}]`)
        .join(" | ")}`,
  );
  expect(summary).toEqual([]);
}

/** La page ne déborde jamais horizontalement. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
