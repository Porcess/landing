import { expect, test, type Page } from "@playwright/test";

/**
 * The offer, end to end.
 *
 * Opt-in on purpose. Changing the offer writes to the database and creating a
 * signup writes a row, so this spec runs only when `E2E_DATABASE_URL` points at a
 * disposable database (which also becomes the server's `DATABASE_URL`). The
 * default suite has no database and skips it entirely.
 *
 * Every case restores the offer it found, so a run leaves the database as it
 * found it.
 */

const STATS = "/a/n/stats";
const PASSWORD = process.env.STATS_PASSWORD ?? "test-password";
const configured =
  process.env.E2E_DATABASE_URL !== undefined &&
  process.env.E2E_DATABASE_URL.length > 0;

async function logIn(page: Page) {
  await page.goto(STATS);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
}

async function readOffer(page: Page) {
  await page.goto(`${STATS}#offer`);
  await expect(page.getByRole("button", { name: "Save offer" })).toBeVisible();
  return {
    percent: await page.getByLabel("Discount percent").inputValue(),
    basePriceCents: await page.getByLabel("Base price, cents").inputValue(),
  };
}

async function writeOffer(page: Page, percent: string, basePriceCents: string) {
  await page.goto(`${STATS}#offer`);
  await page.getByLabel("Discount percent").fill(percent);
  await page.getByLabel("Base price, cents").fill(basePriceCents);
  await page.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByText("Offer saved.")).toBeVisible();
}

test.describe("the offer", () => {
  test.skip(
    !configured,
    "needs E2E_DATABASE_URL pointed at a disposable database",
  );

  test("is editable, drives the landing price, and is captured by signups", async ({
    page,
  }) => {
    await logIn(page);
    const original = await readOffer(page);

    try {
      await writeOffer(page, "75", "2000");

      // The landing page shows the new discount and the price it produces.
      await page.goto("/");
      await expect(page.getByText("75% off").first()).toBeVisible();
      await expect(page.getByText("$5").first()).toBeVisible();
      await expect(page.locator(".pricing-strike")).toHaveText("$20");

      // A signup submitted now locks in 75%, and the confirmation says so.
      const email = `offer-${String(Date.now())}@example.com`;
      const form = page.locator("[data-early-access='hero']").first();
      await form.getByLabel("Email address").fill(email);
      await form.getByRole("button").click();
      await expect(
        form.getByText("You’re on the list for 75% off when Porcess launches."),
      ).toBeVisible();

      // The history records the change, with the value it replaced.
      await page.goto(`${STATS}#offer`);
      await expect(page.getByText("was 90% off").first()).toBeVisible();
    } finally {
      await writeOffer(page, original.percent, original.basePriceCents);
    }
  });
});
