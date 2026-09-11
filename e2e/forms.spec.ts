import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * The whole form lifecycle, including the failure paths. The endpoint is
 * stubbed per case so each state can be reached deterministically; the last
 * case deliberately does not stub anything and exercises the real route.
 */

const HERO = "[data-early-access='hero']";
const EMAIL = "builder@example.com";

function json(route: Route, status: number, payload: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function heroForm(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-hero-ready="true"]')).toBeAttached({
    timeout: 20_000,
  });
  return page.locator(HERO).first();
}

test("an empty submission is refused in the browser", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/early-access")) {
      posts.push(request.url());
    }
  });

  const form = await heroForm(page);
  await form.getByRole("button").click();

  await expect(form.getByRole("alert")).toHaveText(
    "Enter your email address to join the early list.",
  );
  expect(posts).toHaveLength(0);
});

test("a malformed address is refused in the browser", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/early-access")) {
      posts.push(request.url());
    }
  });

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill("builder@");
  await form.getByRole("button").click();

  await expect(form.getByRole("alert")).toHaveText(
    "That doesn\u2019t look like an email address.",
  );
  expect(posts).toHaveLength(0);
});

test("shows the submitting state while the request is in flight", async ({
  page,
}) => {
  await page.route("**/early-access", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await json(route, 200, { status: "subscribed" });
  });

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  const submit = form.getByRole("button");
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveText("GETTING YOU IN");

  await expect(form.getByText("You\u2019re in.")).toBeVisible();
});

test("confirms a new signup and states the free month", async ({ page }) => {
  await page.route("**/early-access", (route) =>
    json(route, 200, { status: "subscribed" }),
  );

  const form = await heroForm(page);
  const before = await form.boundingBox();

  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByText("You\u2019re in.")).toBeVisible();
  await expect(form.getByText("Welcome to Porcess.")).toBeVisible();
  await expect(
    form.getByText(
      "You\u2019re on the list for 90% off your first 3 months when Porcess launches.",
    ),
  ).toBeVisible();
  await expect(
    form.getByText("You\u2019re also in the draw for 3 months free."),
  ).toBeVisible();

  // The confirmation must not shove the page around.
  const after = await form.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  const delta = Math.abs((after?.height ?? 0) - (before?.height ?? 0));
  expect(
    delta,
    "success block should be about as tall as the form",
  ).toBeLessThan(80);

  // Keyboard focus lands on the confirmation, never on a removed control.
  const focused = await page.evaluate(() => {
    const active = document.activeElement;
    return active === null
      ? ""
      : `${active.tagName}:${active.textContent?.slice(0, 12) ?? ""}`;
  });
  expect(focused).toContain("You\u2019re in");
});

test("tells a returning visitor they were already on the list", async ({
  page,
}) => {
  await page.route("**/early-access", (route) =>
    json(route, 200, { status: "already_subscribed" }),
  );

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByText("You\u2019re in.")).toBeVisible();
  await expect(form.getByText("You were already on the list.")).toBeVisible();
});

test("offers a retry when the server fails", async ({ page }) => {
  await page.route("**/early-access", (route) =>
    json(route, 500, { status: "error" }),
  );

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByRole("alert")).toHaveText(
    "Something went wrong on our end. Try again.",
  );

  // The retry must keep what was typed and re-enable the control.
  await expect(form.getByLabel("Email address")).toHaveValue(EMAIL);
  await expect(form.getByRole("button")).toBeEnabled();
});

test("distinguishes an unconfigured backend from a broken one", async ({
  page,
}) => {
  await page.route("**/early-access", (route) =>
    json(route, 503, { status: "unconfigured" }),
  );

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByRole("alert")).toHaveText(
    "Signups aren\u2019t connected yet. Try again shortly.",
  );
});

/**
 * No stub here on purpose. This deployment has no DATABASE_URL, so the real
 * route handler runs and must fail closed rather than accept the address.
 */
test("the real endpoint fails closed without a database", async ({ page }) => {
  test.skip(
    process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== "",
    "only meaningful while the database is unconfigured",
  );

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByRole("alert")).toHaveText(
    "Signups aren\u2019t connected yet. Try again shortly.",
    { timeout: 15_000 },
  );
});

test("the closing call to action works too", async ({ page }) => {
  await page.route("**/early-access", (route) =>
    json(route, 200, { status: "subscribed" }),
  );

  await page.goto("/");
  const form = page.locator("#final-cta [data-early-access='final']").first();
  await form.scrollIntoViewIfNeeded();
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();

  await expect(form.getByText("You\u2019re in.")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/final-cta-success.png" });
});
