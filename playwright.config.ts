import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a production build on its own port, never against the dev
 * server: a dev server and a build share `.next`, and serving stale chunks from
 * one while building the other is how a verification pass ends up measuring
 * something that was never deployed.
 */
const PORT = Number(process.env.E2E_PORT ?? "3106");
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
