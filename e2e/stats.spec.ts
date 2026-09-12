import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The private dashboard and the collector that feeds it.
 *
 * The server these run against has `DATABASE_URL` forced empty, exactly like a
 * fresh deployment, so what is verified here is the gate itself: that it keeps
 * people out, that it says so honestly when there is nothing to read, and that
 * the collector refuses what it should. The numbers are covered by the query
 * tests, which can control their input.
 */

const STATS = "/a/n/stats";
const PASSWORD = process.env.STATS_PASSWORD ?? "test-password";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

type AxeEntries = { id: string; help: string; nodes: unknown[] }[];
type AxeNode = { target: string[]; failureSummary?: string };

function format(entries: AxeEntries): string {
  return entries
    .map((entry) => {
      const nodes = (entry.nodes as AxeNode[])
        .slice(0, 6)
        .map(
          (node) =>
            `    - ${node.target.join(" ")}: ${node.failureSummary ?? ""}`,
        )
        .join("\n");
      return `${entry.id}: ${entry.help} (${entry.nodes.length})\n${nodes}`;
    })
    .join("\n");
}

async function audit(page: Page) {
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

async function logIn(page: Page) {
  await page.goto(STATS);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
}

test.describe("the door", () => {
  test("asks for a password and shows nothing without one", async ({
    page,
  }) => {
    await page.goto(STATS);

    await expect(page.getByLabel("Password")).toBeVisible();
    // No numbers of any kind before the password is right.
    await expect(page.locator("[data-stats-health]")).toHaveCount(0);
    await expect(page.getByText("Page views")).toHaveCount(0);
  });

  test("refuses a wrong password and hands out no cookie", async ({
    context,
    page,
  }) => {
    await page.goto(STATS);
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Enter" }).click();

    await expect(page.getByText("That password is not right.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Stats" })).toHaveCount(0);
    expect(await context.cookies()).toHaveLength(0);
  });

  test("lets the right password in and sets a scoped, httpOnly cookie", async ({
    context,
    page,
  }) => {
    await logIn(page);
    await expect(page.locator("[data-stats-health]")).toBeVisible();

    const cookie = (await context.cookies()).find(
      (entry) => entry.name === "porcess_stats",
    );

    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    // Scoped to the private path, so the public page never receives it.
    expect(cookie?.path).toBe(STATS);
    expect(cookie?.sameSite).toBe("Lax");
  });

  test("does not survive a reload as a form", async ({ page }) => {
    await logIn(page);

    await page.reload();

    // Still in, without typing anything again.
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveCount(0);
  });

  test("signs out and stops answering", async ({ page }) => {
    await logIn(page);

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByLabel("Password")).toBeVisible();
    await page.goto(STATS);
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("gives up after five wrong attempts", async ({ page }) => {
    // A distinct forwarded address, so this case burns its own budget: the
    // limiter is keyed per caller and every other test shares one.
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "203.0.113.7" });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.goto(STATS);
      await page.getByLabel("Password").fill("wrong");
      await page.getByRole("button", { name: "Enter" }).click();
      await expect(page.getByText("That password is not right.")).toBeVisible();
    }

    // Now even the right password is refused, which is the point of the limit.
    await page.goto(STATS);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText("That password is not right.")).toBeVisible();
  });

  test("is kept out of search engines", async ({ page, request }) => {
    await page.goto(STATS);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /a/");
  });

  test("refuses the export without a session", async ({ request }) => {
    const response = await request.get(`${STATS}/export`);

    expect(response.status()).toBe(404);
  });
});

test.describe("the dashboard", () => {
  test("says the database is missing instead of showing zeroes", async ({
    page,
  }) => {
    await logIn(page);

    await expect(page.locator("[data-stats-empty]")).toContainText(
      "No database is configured",
    );
    await expect(page.locator("[data-stats-health]")).toContainText(
      "not configured",
    );
    // No fabricated figures anywhere.
    await expect(page.getByText("Page views")).toHaveCount(0);
  });

  test("renders the sign in form without accessibility violations", async ({
    page,
  }) => {
    await page.goto(STATS);

    const results = await audit(page);

    expect(format(results.violations)).toBe("");
    expect(format(results.incomplete)).toBe("");
  });

  test("renders the dashboard without accessibility violations", async ({
    page,
  }) => {
    await logIn(page);

    const results = await audit(page);

    expect(format(results.violations)).toBe("");
    expect(format(results.incomplete)).toBe("");
  });
});

test.describe("the collector", () => {
  test("stores a well formed event", async ({ request }) => {
    const response = await request.post("/analytics", {
      data: {
        event: "page_view",
        path: "/",
        visitor: "11111111-2222-3333-4444-555555555555",
        properties: { placement: "hero" },
      },
    });

    expect(response.status()).toBe(204);
  });

  test("refuses an event name it does not know", async ({ request }) => {
    const response = await request.post("/analytics", {
      data: { event: "made_up_event" },
    });

    expect(response.status()).toBe(400);
  });

  test("refuses a body that is not an event", async ({ request }) => {
    const response = await request.post("/analytics", {
      data: { nothing: true },
    });

    expect(response.status()).toBe(400);
  });

  test("the page reports its own view", async ({ page }) => {
    const beacon = page.waitForRequest(
      (request) =>
        request.url().includes("/analytics") && request.method() === "POST",
    );

    await page.goto("/");

    const captured = await beacon;
    const body = captured.postDataJSON() as {
      event: string;
      path: string;
      visitor: string | null;
    };

    expect(body.event).toBe("page_view");
    expect(body.path).toBe("/");
    // The visitor id is what makes unique visitors countable at all.
    expect(body.visitor).toBeTruthy();
  });

  test("the private area never reports itself", async ({ page }) => {
    const beacons: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/analytics")) {
        beacons.push(request.url());
      }
    });

    await logIn(page);
    await page.waitForTimeout(1500);

    // A dashboard that counted its own visits would report the numbers it is
    // being read to check.
    expect(beacons).toEqual([]);
  });
});
