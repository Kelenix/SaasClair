import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createHash } from "node:crypto";

// Script de collecte sur un faux site client à deux sous-domaines (www et app) : même visiteur
// d'un sous-domaine à l'autre, et inscrit relié par l'empreinte de son email, sans ligne à
// ajouter. Les envois sont relevés dans la page (navigator.sendBeacon), sans serveur.
test.use({ storageState: { cookies: [], origins: [] } });

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36";
type Sent = { t: string; v: string; u: string; e?: string };

async function clientSite(context: BrowserContext, baseURL: string) {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    const sent: unknown[] = [];
    (window as unknown as { __sent: unknown[] }).__sent = sent;
    navigator.sendBeacon = (_url: string | URL, body?: BodyInit | null) => {
      sent.push(JSON.parse(String(body)));
      return true;
    };
  });
  const head = `<script async src="${baseURL}/s.js" data-site="abcdef12"></script>`;
  const pages: Record<string, string> = {
    "http://www.monsaas.localhost/": `<a href="http://app.monsaas.localhost/inscription">Essai gratuit</a>`,
    "http://app.monsaas.localhost/inscription": `<form onsubmit="event.preventDefault()"><input type="email" name="email"><input type="password" name="password"><button>Créer</button></form>`,
    "http://app.monsaas.localhost/connexion": `<form onsubmit="event.preventDefault()"><input type="email" name="email"><input type="password" name="password"><button>Se connecter</button></form>`,
  };
  await context.route("http://*.monsaas.localhost/**", (route) => {
    const url = new URL(route.request().url());
    const body = pages[`${url.origin}${url.pathname}`] ?? "<p>Page</p>";
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head>${head}</head><body>${body}</body></html>`,
    });
  });
}

const sent = (page: Page) => page.evaluate(() => (window as unknown as { __sent: Sent[] }).__sent);

test("même visiteur sur www et app, inscrit relié sans ligne à ajouter", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ userAgent: BROWSER_UA });
  await clientSite(context, baseURL!);
  const page = await context.newPage();

  await page.goto("http://www.monsaas.localhost/");
  await expect.poll(async () => (await sent(page)).length).toBe(1);
  const [{ v: visitor }] = await sent(page);

  // Lien vers app : l'identifiant suit le visiteur, puis disparaît de l'adresse.
  await page.getByRole("link", { name: "Essai gratuit" }).click();
  await expect(page).toHaveURL("http://app.monsaas.localhost/inscription");
  await expect.poll(async () => (await sent(page))[0]?.v).toBe(visitor);

  // Formulaire d'inscription : l'empreinte de l'email part, jamais l'email.
  await page.locator('input[type="email"]').fill("Nadia@Exemple.fr ");
  await page.locator('input[type="password"]').fill("Secret-2026!");
  await page.getByRole("button", { name: "Créer" }).click();
  const hash = createHash("sha256").update("nadia@exemple.fr").digest("hex");
  await expect
    .poll(async () => (await sent(page)).find((item) => item.t === "identify"))
    .toMatchObject({ t: "identify", v: visitor, e: hash });
  expect(JSON.stringify(await sent(page))).not.toContain("exemple.fr");

  // Formulaire de connexion : pas une inscription, rien n'est envoyé.
  await page.goto("http://app.monsaas.localhost/connexion");
  await page.locator('input[type="email"]').fill("nadia@exemple.fr");
  await page.locator('input[type="password"]').fill("Secret-2026!");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForTimeout(500);
  expect((await sent(page)).some((item) => item.t === "identify")).toBe(false);
  await context.close();
});
