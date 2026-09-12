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

test("confirms a new signup and states the discount", async ({ page }) => {
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
      "You\u2019re on the list for 90% off when Porcess launches.",
    ),
  ).toBeVisible();
  await expect(form.getByText(/draw|3 months free/i)).toHaveCount(0);

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

test("answering one placement settles every other one on the page", async ({
  page,
}) => {
  await page.route("**/early-access", (route) =>
    json(route, 200, { status: "subscribed" }),
  );

  await page.goto("/");

  // The page offers the field twice. Both are asking before the visitor replies.
  const fields = page.locator("[data-early-access] input[name='email']");
  await expect(fields).toHaveCount(2);

  const hero = page.locator("[data-early-access='hero']").first();
  await hero.scrollIntoViewIfNeeded();
  await hero.getByLabel("Email address").fill(EMAIL);
  await hero.getByRole("button").click();

  await expect(page.getByText("You\u2019re in.").first()).toBeVisible();

  // And the fields are gone from the whole page, not just from the form that
  // was used: nothing is still asking for an address that was just handed over.
  await expect(page.locator("input[name='email']")).toHaveCount(0);
  await expect(
    page.locator("[data-early-access]").getByRole("button"),
  ).toHaveCount(0);
  await expect(page.locator("[data-early-access]")).toHaveCount(2);
  await expect(page.getByText("You\u2019re in.")).toHaveCount(2);

  await page.screenshot({ path: "test-results/shots/signup-settled.png" });
});

test("a reload does not ask a second time", async ({ page }) => {
  await page.route("**/early-access", (route) =>
    json(route, 200, { status: "subscribed" }),
  );

  const form = await heroForm(page);
  await form.getByLabel("Email address").fill(EMAIL);
  await form.getByRole("button").click();
  await expect(form.getByText("You\u2019re in.")).toBeVisible();

  // Reload the page the way a visitor would. The field must not come back.
  await page.reload();
  await expect(page.locator('[data-hero-ready="true"]')).toBeAttached({
    timeout: 20_000,
  });

  await expect(page.locator("input[name='email']")).toHaveCount(0);
  await expect(
    page.locator("[data-early-access]").getByRole("button"),
  ).toHaveCount(0);
  await expect(page.getByText("You\u2019re in.")).toHaveCount(2);

  await page.screenshot({ path: "test-results/shots/reload-remembered.png" });
});
