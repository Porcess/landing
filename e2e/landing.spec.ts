import { expect, test } from "@playwright/test";

const SHOTS = "test-results/shots";

test.describe("product landing", () => {
  test("opens with the product explanation and agent deck", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-hero-ready="true"]')).toBeAttached();
    await expect(
      page.getByRole("heading", {
        name: "Build the thing. Let Porcess handle what comes next.",
      }),
    ).toBeVisible();
    await expect(page.locator(".agent-card")).toHaveCount(4);
    await expect(page.getByText("Clips", { exact: true })).toBeVisible();
    await expect(page.getByText("Shorts", { exact: true })).toBeVisible();
    await expect(page.getByText("Marketing", { exact: true })).toBeVisible();
    await expect(page.getByText("SEO", { exact: true })).toBeVisible();
    await expect(page.locator("#how-it-works")).toBeVisible();

    // With no database, the pricing section shows the launch offer: 90% off the
    // $20 base, so $2 a month.
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.locator("#pricing").getByText("90% off")).toBeVisible();
    await expect(page.locator(".pricing-amount")).toContainText("$2");
    await expect(page.locator(".pricing-strike")).toHaveText("$20");

    await page.screenshot({
      path: `${SHOTS}/product-landing.png`,
      fullPage: true,
    });
  });

  test("keeps the first viewport free of horizontal overflow", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 375, height: 667 },
      { width: 768, height: 900 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const geometry = await page.evaluate(() => ({
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        heroBottom:
          document.querySelector(".product-hero")?.getBoundingClientRect()
            .bottom ?? 0,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
      expect(geometry.heroBottom).toBeGreaterThan(geometry.innerHeight * 0.8);
    }
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keeps the complete agent deck visible without animation", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator(".agent-card")).toHaveCount(4);
      const animations = await page
        .locator(".agent-card")
        .evaluateAll((cards) =>
          cards.map((card) => getComputedStyle(card).animationName),
        );
      expect(animations.every((value) => value === "none")).toBe(true);
    });
  });
});
