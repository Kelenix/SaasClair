import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout sur l'image de production locale (`npm run up:prod`, port 3001), ou sur
// BASE_URL. Le mode développement est trop lent à compiler pour des tests fiables.
// En local, Chrome déjà installé suffit ; en CI, Chromium est installé par Playwright.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    locale: "fr-FR",
    trace: "retain-on-failure",
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "ordinateur",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/nadia.json" },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 780 },
        storageState: "e2e/.auth/nadia.json",
      },
      dependencies: ["setup"],
      testMatch: /(accessibility|responsive)\.spec\.ts/,
    },
  ],
});
