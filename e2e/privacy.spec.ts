import { expect, test } from "@playwright/test";

// saasclair.com se mesure avec son propre script, et chacun peut refuser d'être compté en un clic
// depuis la politique de confidentialité.
test.use({ storageState: { cookies: [], origins: [] } });

test("le site porte son script de mesure, et le refus d'être compté tient en un clic", async ({
  page,
}) => {
  await page.goto("/confidentialite");
  await expect(page.locator('script[src="/s.js"][data-site="6eead66e"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Ne plus compter mes visites" }).click();
  await expect(
    page.getByText("Vos visites ne sont plus comptées sur ce navigateur.").first(),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sc_off"))).toBe("1");

  await page.getByRole("button", { name: "Les compter à nouveau" }).click();
  await expect(page.getByText("Vos visites sont de nouveau comptées.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sc_off"))).toBeNull();
});
