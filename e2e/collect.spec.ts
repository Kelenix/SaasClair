import { expect, test } from "@playwright/test";

// Collecte réelle (ADR-023) : un faux site client installe la ligne de script ; la visite est
// reçue, la configuration la détecte d'elle-même et l'écran Acquisition l'affiche.
test.use({ storageState: { cookies: [], origins: [] } });

// Adresse locale : Chrome bloque les requêtes d’un site public vers localhost (pas en production,
// où le site du client et saasclair.com sont tous deux publics).
const CLIENT_SITE = "http://monsaas.localhost";
// Navigateur ordinaire : le script ignore les robots (navigator.webdriver, « HeadlessChrome »).
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36";

test("une vraie visite est détectée puis affichée dans l'acquisition", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await page.goto("/inscription", { waitUntil: "networkidle" });
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Email professionnel").fill(`collecte-${Date.now()}@test.saasclair.fr`);
  await page.getByLabel("Mot de passe").fill("Collecte-2026!");
  await page.getByRole("button", { name: /Créer mon compte/ }).click();
  await expect(page).toHaveURL(/\/configuration/, { timeout: 30_000 });

  // Adresse passée (le faux site n'existe pas sur Internet), puis la ligne de script à installer.
  await page.getByRole("button", { name: "Passer cette étape" }).click();
  const snippet = page.locator("code, pre").filter({ hasText: "data-site" }).first();
  await expect(snippet).toContainText("/s.js");
  const siteKey = (await snippet.textContent())?.match(/data-site="([0-9a-f]{8})"/)?.[1];
  expect(siteKey).toBeTruthy();

  // Le site du client, avec la ligne collée dans son <head>, visité depuis LinkedIn.
  const visitor = await browser.newContext({ userAgent: BROWSER_UA });
  await visitor.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }),
  );
  await visitor.route(`${CLIENT_SITE}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><head><script async src="${baseURL}/s.js" data-site="${siteKey}"></script></head><body><h1>Mon SaaS</h1></body></html>`,
    }),
  );
  const site = await visitor.newPage();
  const collected = site.waitForResponse((response) => response.url().endsWith("/api/collect"));
  await site.goto(`${CLIENT_SITE}/tarifs?utm_source=linkedin&utm_campaign=lancement`, {
    referer: "https://www.linkedin.com/feed/",
  });
  expect((await collected).status()).toBe(204);
  await visitor.close();

  // Détection réelle : l'étape passe d'elle-même au vert.
  await expect(page.getByText("Script détecté. Première visite reçue.")).toBeVisible({
    timeout: 20_000,
  });

  // L'écran Acquisition montre ce visiteur, son canal, sa page d'entrée et sa campagne.
  await page.goto("/app/acquisition", { waitUntil: "networkidle" });
  await expect(page.getByText(/^1 visiteur sur la période/)).toBeVisible();
  await expect(page.getByText("Canal n° 1 : LinkedIn")).toBeVisible();
  await expect(page.getByText("/tarifs", { exact: true })).toBeVisible();
  await expect(page.getByText("lancement", { exact: true })).toBeVisible();

  // L'accueil réunit les sources : la visite y figure, et Stripe y est proposé.
  await page.goto("/app", { waitUntil: "networkidle" });
  const home = page.locator("main").filter({ visible: true });
  await expect(home.getByRole("heading", { name: "Vos visiteurs" })).toBeVisible();
  await expect(home).toContainText(/1 visiteur sur la période/);
  await expect(home.getByRole("heading", { name: "Vos revenus" })).toBeVisible();
});
