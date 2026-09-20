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
    // The suite must never write to a real database: forcing the connection
    // string empty keeps the signup path on its fail-closed branch, which is
    // what "the real endpoint fails closed without a database" asserts. It also
    // means the stats dashboard has to render its unconfigured state, which is
    // the state a fresh deployment is actually in.
    env: {
      ...process.env,
      // The default suite runs with no database at all. `E2E_DATABASE_URL` is an
      // opt-in for the one spec that has to write to a database to prove the
      // offer is editable; it must point at a disposable one.
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      // The dashboard has to be reachable for its own tests, and the value has
      // to be knowable by them, so the server and the specs share one default.
      STATS_PASSWORD: process.env.STATS_PASSWORD ?? "test-password",
    },
  },
});
