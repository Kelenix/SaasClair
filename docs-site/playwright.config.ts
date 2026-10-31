import { defineConfig } from "@playwright/test";

// Captures de la documentation (npm run docs:capture), sur l'image de production locale.
export default defineConfig({
  testDir: ".",
  testMatch: /capture\.spec\.ts/,
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    locale: "fr-FR",
    channel: process.env.CI ? undefined : "chrome",
  },
});
