import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

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

/**
 * Code à 6 chiffres d'une application d'authentification (TOTP, RFC 6238 : HMAC-SHA1, 30 s),
 * pour la double authentification du super administrateur.
 */
export function totp(secret: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = secret
    .replace(/[\s=]/g, "")
    .toUpperCase()
    .split("")
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export const PUBLIC_PAGES = [
  "/",
  "/a-propos",
  "/confidentialite",
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
