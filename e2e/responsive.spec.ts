import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

// Navigation au clavier et préférence « réduire les animations » (CLAUDE.md §3 et §4).
test.describe("clavier", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("le premier élément atteint au clavier est visible et entouré", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("animations réduites", () => {
  test.use({ reducedMotion: "reduce" });

  test("les chiffres clés s'affichent tout de suite à leur valeur finale", async ({ page }) => {
    await page.goto("/app", { waitUntil: "networkidle" });
    // Le compteur visible (le texte lu par les lecteurs d'écran est à part).
    const counter = page.locator("span[aria-hidden=true]", { hasText: /^25\s000\s€$/ }).first();
    await expect(counter).toBeVisible({ timeout: 2_000 });
    await expectNoHorizontalScroll(page);
  });
});

test("le tableau de bord se parcourt sans débordement", async ({ page }) => {
  for (const path of ["/app", "/app/churn", "/app/insights"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});
