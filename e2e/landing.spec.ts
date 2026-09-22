import { expect, test } from "@playwright/test";

const SHOTS = "test-results/shots";

test.describe("product landing", () => {
  test("opens with the product explanation and agent deck", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-hero-ready="true"]')).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Trust the Porcess" }),
    ).toBeVisible();
    // The brand word is present as the animated word, not just as the heading.
    await expect(page.locator("[data-word]")).toBeVisible();
    await expect(page.locator(".hero-seam-light")).toBeAttached();
    await expect(page.locator(".hero-seam-dark")).toBeAttached();
    // The fixed nav moved into the hero: brand, offer, and anchors ride in the
    // masthead, the site mark sits alongside the title, and no fixed header
    // remains.
    await expect(page.locator(".hero-masthead")).toBeVisible();
    await expect(page.locator(".hero-masthead-brand")).toHaveText("PORCESS");
    await expect(
      page
        .locator(".hero-masthead")
        .getByRole("link", { name: "HOW IT WORKS" }),
    ).toHaveAttribute("href", "#how-it-works");
    await expect(
      page
        .locator(".hero-masthead")
        .getByRole("link", { name: "EARLY ACCESS" }),
    ).toHaveAttribute("href", "#early-access");
    await expect(page.locator(".hero-masthead-mark")).toBeVisible();
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator(".agent-card")).toHaveCount(5);
    await expect(page.getByText("Clips", { exact: true })).toBeVisible();
    await expect(page.getByText("Shorts", { exact: true })).toBeVisible();
    await expect(page.getByText("Marketing", { exact: true })).toBeVisible();
    await expect(page.getByText("SEO", { exact: true })).toBeVisible();
    await expect(page.getByText("Testing", { exact: true })).toBeVisible();
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

  test("fits the split to one viewport with a two-thirds card peek", async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1600, height: 900 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1280, height: 1024 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.locator('[data-hero-ready="true"]')).toBeAttached();

      const geometry = await page.evaluate(() => {
        const hero = document
          .querySelector(".product-hero")
          ?.getBoundingClientRect();
        const split = document
          .querySelector(".hero-split")
          ?.getBoundingClientRect();
        const card = document
          .querySelector(".agent-card")
          ?.getBoundingClientRect();
        const vh = window.innerHeight;
        const visible = card
          ? Math.max(0, Math.min(card.bottom, vh) - Math.max(card.top, 0))
          : 0;
        return {
          vh,
          heroH: hero?.height ?? 0,
          splitTop: split?.top ?? -1,
          splitH: split?.height ?? 0,
          peek: card ? (visible / card.height) * 100 : 0,
          // The full card fits inside the hero: scrolling reveals it whole,
          // nothing is clipped at the fold.
          cardBottom: card?.bottom ?? 0,
          heroBottom: hero?.bottom ?? 0,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      // The split is exactly the first viewport, so the seam runs corner to
      // corner instead of ending below the fold, while the hero stays taller
      // to hold the full cards below it.
      expect(geometry.splitTop).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.splitH - geometry.vh)).toBeLessThanOrEqual(2);
      expect(geometry.heroH).toBeGreaterThan(geometry.vh);
      // Roughly the top two-thirds of the cards shows at the fold.
      expect(geometry.peek).toBeGreaterThan(55);
      expect(geometry.peek).toBeLessThan(75);
      expect(geometry.cardBottom).toBeLessThanOrEqual(geometry.heroBottom);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.innerWidth);
    }
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keeps the complete agent deck visible without animation", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.locator(".agent-card")).toHaveCount(5);
      const animations = await page
        .locator(".agent-card")
        .evaluateAll((cards) =>
          cards.map((card) => getComputedStyle(card).animationName),
        );
      expect(animations.every((value) => value === "none")).toBe(true);
    });
  });
});
