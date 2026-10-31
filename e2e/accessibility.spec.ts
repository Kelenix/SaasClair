import { expect, test } from "@playwright/test";
import {
  DASHBOARD_PAGES,
  expectNoA11yViolations,
  expectNoHorizontalScroll,
  PUBLIC_PAGES,
  revealWholePage,
} from "./helpers";

test.describe("pages publiques", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PUBLIC_PAGES) {
    test(`${path} est accessible et ne déborde pas`, async ({ page }) => {
      await page.goto(path);
      await revealWholePage(page);
      await expectNoA11yViolations(page);
      await expectNoHorizontalScroll(page);
    });
  }
});

test.describe("tableau de bord", () => {
  for (const path of DASHBOARD_PAGES) {
    test(`${path} est accessible et ne déborde pas`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await revealWholePage(page);
      await expectNoA11yViolations(page);
      await expectNoHorizontalScroll(page);
    });
  }
});
