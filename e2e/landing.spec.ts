import { expect, test, type Page } from "@playwright/test";

/**
 * Geometry, the word swap, and the two fallbacks that must work without full
 * animation: reduced motion and no scripting at all.
 */

declare global {
  interface Window {
    /** Per frame beam samples, collected inside the page during the pass. */
    __beamSamples?: BeamSample[];
    /** Peak beam opacity seen during a pass. */
    __beamMax?: () => number;
  }
}

interface BeamSample {
  t: number;
  opacity: number;
  headPct: number;
  heightPx: number;
  widthPx: number;
  incomingOpacity: number | null;
}

const SHOTS = "test-results/shots";

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1440", width: 1440, height: 900 },
  { name: "wide-1920", width: 1920, height: 1080 },
];

async function openHero(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-hero-ready="true"]')).toBeAttached({
    timeout: 20_000,
  });
}

function opacity(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((node) => Number(getComputedStyle(node).opacity));
}

test.describe("hero", () => {
  test("lands on PORCESS with the copy revealed", async ({ page }) => {
    await openHero(page);

    // The two letters have changed places...
    expect(
      await opacity(page, "[data-slot='swap-left'] [data-swap$='-in']"),
    ).toBe(1);
    expect(
      await opacity(page, "[data-slot='swap-right'] [data-swap$='-in']"),
    ).toBe(1);
    expect(
      await opacity(page, "[data-slot='swap-left'] [data-swap$='-out']"),
    ).toBe(0);
    expect(
      await opacity(page, "[data-slot='swap-right'] [data-swap$='-out']"),
    ).toBe(0);

    // ...and the copy is readable.
    for (const selector of ["[data-reveal] >> nth=0", "form"]) {
      const revealed = await page
        .locator(selector)
        .first()
        .evaluate((node) => Number(getComputedStyle(node).opacity));
      expect(revealed).toBe(1);
    }

    // The heading is the brand sentence, once, and the animated word is
    // hidden from assistive technology rather than read out letter by letter.
    await expect(page.locator("h1")).toHaveText("Trust the Porcess");
    await expect(page.locator("h1")).toHaveClass(/sr-only/);
    const wordIsDecorative = await page
      .locator("[data-word]")
      .evaluate((node) => node.closest('[aria-hidden="true"]') !== null);
    expect(wordIsDecorative).toBe(true);
  });

  test("keeps the word the same width through the swap", async ({ page }) => {
    await openHero(page);

    // Both glyphs of a swapping seat share one grid cell, so the seat is as
    // wide as the wider of the two and the word cannot reflow mid animation.
    const geometry = await page.evaluate(() => {
      const measure = (selector: string) => {
        const node = document.querySelector(selector);
        if (node === null) {
          throw new Error(`missing ${selector}`);
        }
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      };

      const slot = measure("[data-slot='swap-left']");
      const inGlyph = measure("[data-slot='swap-left'] [data-swap$='-in']");
      const outGlyph = measure("[data-slot='swap-left'] [data-swap$='-out']");
      const word = measure("[data-word]");

      return { slot, inGlyph, outGlyph, word };
    });

    // Same cell, same left edge, stacked.
    expect(
      Math.abs(geometry.inGlyph.left - geometry.outGlyph.left),
    ).toBeLessThan(0.5);
    expect(
      Math.abs(geometry.inGlyph.width - geometry.outGlyph.width),
    ).toBeLessThan(2);
    expect(geometry.slot.width + 0.5).toBeGreaterThanOrEqual(
      Math.max(geometry.inGlyph.width, geometry.outGlyph.width),
    );
    // The word is one line, inside the viewport, and dominant.
    expect(geometry.word.width).toBeGreaterThan(200);
  });

  test.describe("at every viewport", () => {
    for (const viewport of VIEWPORTS) {
      test(`${viewport.name} keeps the hero, the form and the page in bounds`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await openHero(page);

        const measured = await page.evaluate(() => {
          const form = document.querySelector("form");
          const word = document.querySelector("[data-word]");
          const hero = document.querySelector("section");
          if (form === null || word === null || hero === null) {
            throw new Error("hero is incomplete");
          }

          const formRect = form.getBoundingClientRect();
          const wordRect = word.getBoundingClientRect();

          return {
            innerHeight: window.innerHeight,
            innerWidth: window.innerWidth,
            formBottom: formRect.bottom,
            wordLeft: wordRect.left,
            wordRight: wordRect.right,
            wordFontSize: Number(
              getComputedStyle(word).fontSize.replace("px", ""),
            ),
            scrollWidth: document.documentElement.scrollWidth,
            heroTop: hero.getBoundingClientRect().top,
          };
        });

        // No horizontal overflow anywhere, at any width.
        expect(measured.scrollWidth).toBeLessThanOrEqual(measured.innerWidth);

        // The primary call to action is reachable without scrolling.
        expect(measured.formBottom).toBeLessThanOrEqual(measured.innerHeight);

        // The word stays inside its gutters and stays enormous.
        expect(measured.wordLeft).toBeGreaterThanOrEqual(0);
        expect(measured.wordRight).toBeLessThanOrEqual(measured.innerWidth);
        expect(measured.wordFontSize).toBeGreaterThanOrEqual(50);

        await page.screenshot({
          path: `${SHOTS}/hero-${viewport.name}.png`,
          fullPage:
            viewport.name === "mobile-375" || viewport.name === "laptop-1440",
        });
      });
    }
  });

  test("320px does not overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await openHero(page);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(320);

    await page.screenshot({ path: `${SHOTS}/probe-320.png` });
  });
});

test.describe("the scan line is the thing doing the work", () => {
  test("is vertical, travels across the word, and is over the letters as they change", async ({
    page,
  }) => {
    // Sampled every frame inside the page, because a single screenshot can
    // easily land before or after the pass and prove nothing.
    await page.addInitScript(() => {
      const samples: BeamSample[] = [];
      const start = performance.now();

      const tick = () => {
        const line = document.querySelector("[data-beam-line]");
        const word = document.querySelector("[data-word]");
        const incoming = document.querySelector("[data-swap='o-in']");

        if (line !== null && word !== null) {
          const lineBox = line.getBoundingClientRect();
          const wordBox = word.getBoundingClientRect();
          samples.push({
            t: Math.round(performance.now() - start),
            opacity: Number(getComputedStyle(line).opacity),
            headPct: Math.round(
              ((lineBox.right - wordBox.left) / wordBox.width) * 100,
            ),
            heightPx: Math.round(lineBox.height),
            widthPx: Math.round(lineBox.width),
            incomingOpacity:
              incoming === null
                ? null
                : Number(getComputedStyle(incoming).opacity),
          });
        }

        if (performance.now() - start < 7000) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
      window.__beamSamples = samples;
    });

    await openHero(page);
    await page.waitForTimeout(400);

    const samples = await page.evaluate(() => window.__beamSamples ?? []);

    // It is actually painted, for a meaningful stretch of the pass.
    const painted = samples.filter((s) => s.opacity > 0.5);
    expect(
      painted.length,
      "the line should be visible for many frames",
    ).toBeGreaterThan(30);

    // It is a line standing upright, not a bar lying across the word.
    for (const sample of painted) {
      expect(sample.widthPx, "line should be thin").toBeLessThanOrEqual(3);
      expect(
        sample.heightPx,
        "line should be far taller than it is wide",
      ).toBeGreaterThan(sample.widthPx * 20);
    }

    // It travels across the word rather than fading in place. Measured on any
    // frame where it is meaningfully drawn, not only the fully opaque ones: the
    // fade at the end of the pass is part of the travel, and restricting this to
    // peak opacity would only measure the middle of the journey.
    const visible = samples.filter((s) => s.opacity > 0.05);
    const heads = visible.map((s) => s.headPct);
    expect(Math.max(...heads) - Math.min(...heads)).toBeGreaterThan(90);

    // It enters from before the word and leaves past it.
    expect(Math.min(...heads)).toBeLessThan(5);
    expect(Math.max(...heads)).toBeGreaterThan(95);

    // The letters change while the line is over them, which is the whole point.
    // The first frame the arriving letter starts to appear must still be in the
    // left half of the word, where the two middle letters actually are.
    const firstSwap = painted.find(
      (s) => s.incomingOpacity !== null && s.incomingOpacity > 0.05,
    );
    expect(
      firstSwap,
      "the letters should change during the crossing",
    ).toBeDefined();
    expect(firstSwap?.headPct ?? 999).toBeLessThan(45);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("still plays the sweep, just quieter and without travel", async ({
    page,
  }) => {
    await openHero(page);

    // The word ends up changed...
    expect(
      await opacity(page, "[data-slot='swap-left'] [data-swap$='-in']"),
    ).toBe(1);
    expect(
      await opacity(page, "[data-slot='swap-right'] [data-swap$='-in']"),
    ).toBe(1);

    // ...the copy is readable...
    expect(await opacity(page, "[data-reveal] >> nth=0")).toBe(1);

    // ...and the letters never leave their seats.
    const offsets = await page.evaluate(() => {
      const read = (selector: string) => {
        const node = document.querySelector(selector);
        return node === null ? null : getComputedStyle(node).transform;
      };
      return {
        out: read("[data-swap='r-out']"),
        inn: read("[data-swap='r-in']"),
      };
    });
    const allowed = ["none", "matrix(1, 0, 0, 1, 0, 0)"];
    expect(allowed).toContain(offsets.out);
    expect(allowed).toContain(offsets.inn);

    await page.screenshot({ path: `${SHOTS}/reduced-motion.png` });
  });

  test("the scan line is still painted during the pass", async ({ page }) => {
    await page.addInitScript(() => {
      let maxOpacity = 0;
      const start = performance.now();

      const tick = () => {
        const line = document.querySelector("[data-beam-line]");
        if (line !== null) {
          maxOpacity = Math.max(
            maxOpacity,
            Number(getComputedStyle(line).opacity),
          );
        }
        if (performance.now() - start < 5000) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
      window.__beamMax = () => maxOpacity;
    });

    await openHero(page);
    await page.waitForTimeout(300);

    const maxOpacity = await page.evaluate(() => window.__beamMax?.() ?? 0);
    expect(
      maxOpacity,
      "reduced motion must still show the beam",
    ).toBeGreaterThan(0.5);
  });
});

test.describe("without scripting", () => {
  test.use({ javaScriptEnabled: false });

  test("still shows the hook and the form", async ({ page }) => {
    await page.goto("/");

    const hook = page.locator("[data-reveal]").first();
    await expect(hook).toBeVisible();
    await expect(page.locator("form").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /early access/i }).first(),
    ).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/no-script.png` });
  });
});

test.describe("problem rotation", () => {
  /** Index of the statement currently at full strength. */
  const visibleIndex = (page: Page) =>
    page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#problems h3"));
      return nodes.findIndex(
        (node) =>
          Number(getComputedStyle(node.parentElement ?? node).opacity) > 0.6,
      );
    });

  test("changes on its own with no controls to operate", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#problems h3")).toHaveCount(5);

    // There is no carousel chrome at all: no arrows, no dots, no pause button.
    await expect(page.locator("#problems").getByRole("button")).toHaveCount(0);

    // Rotation only runs while the section is on screen.
    await page.locator("#problems").scrollIntoViewIfNeeded();

    const first = await visibleIndex(page);
    expect(first).toBeGreaterThanOrEqual(0);

    // One statement is legible at a time. A symmetric crossfade would put two
    // at half opacity at once, which is what this guards against.
    const legible = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#problems h3"));
      return nodes.filter((node) => {
        const opacity = Number(
          getComputedStyle(node.parentElement ?? node).opacity,
        );
        return opacity > 0.15 && opacity < 0.85;
      }).length;
    });
    expect(legible).toBeLessThanOrEqual(1);

    await expect
      .poll(() => visibleIndex(page), { timeout: 15_000 })
      .not.toBe(first);
  });

  test("holds while the pointer is over it", async ({ page }) => {
    await page.goto("/");
    await page.locator("#problems").scrollIntoViewIfNeeded();

    await page.locator("#problems").hover();
    const held = await visibleIndex(page);
    await page.waitForTimeout(6_500);
    expect(await visibleIndex(page)).toBe(held);

    await page.mouse.move(0, 0);
    await expect
      .poll(() => visibleIndex(page), { timeout: 15_000 })
      .not.toBe(held);
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("still rotates one statement at a time, and never stacks them", async ({
      page,
    }) => {
      await page.goto("/");
      await page.locator("#problems").scrollIntoViewIfNeeded();

      // The section is a carousel here too. An earlier revision swapped in a
      // five item list under this preference, which replaced the whole section
      // with five stacked statements. That must never come back.
      await expect(page.locator("#problems li")).toHaveCount(0);
      await expect(page.locator("#problems h3")).toHaveCount(5);

      // Exactly one is legible at a time, same as with motion enabled.
      const legible = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("#problems h3"));
        return nodes.filter((node) => {
          const value = Number(
            getComputedStyle(node.parentElement ?? node).opacity,
          );
          return value > 0.6;
        }).length;
      });
      expect(legible).toBe(1);

      // It still advances on its own, with no control to operate.
      await expect(page.locator("#problems").getByRole("button")).toHaveCount(
        0,
      );
      const first = await visibleIndex(page);
      await expect
        .poll(() => visibleIndex(page), { timeout: 15_000 })
        .not.toBe(first);
    });

    test("does not move the statements vertically", async ({ page }) => {
      await page.goto("/");
      await page.locator("#problems").scrollIntoViewIfNeeded();

      // Read every frame across one advance and assert nothing ever shifts on
      // the y axis. That is the whole of what this preference should change.
      const offsets = await page.evaluate(async () => {
        const seen = new Set<string>();
        const start = performance.now();
        while (performance.now() - start < 6000) {
          for (const node of document.querySelectorAll("#problems h3")) {
            seen.add(getComputedStyle(node.parentElement ?? node).transform);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        return [...seen];
      });

      const allowed = ["none", "matrix(1, 0, 0, 1, 0, 0)"];
      for (const value of offsets) {
        expect(allowed).toContain(value);
      }
    });
  });
});

test.describe("the workflow diagram tells the story", () => {
  /** Every status word currently rendered in a section. */
  const statuses = (page: Page, id: string) =>
    page.evaluate((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section === null) {
        return [];
      }
      return Array.from(section.querySelectorAll("span"))
        .map((node) => node.textContent?.trim() ?? "")
        .filter((text) => /^(QUEUED|RUNNING|DONE|FAILED)$/.test(text));
    }, id);

  test("runs forward, fails one step, recovers, and loops back", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#workflow").scrollIntoViewIfNeeded();

    const seen = new Set<string>();
    const started = Date.now();
    let sawFailure = false;

    // Watch until the failure beat has been and gone and nothing is still in
    // flight. Note that SHIP stays FAILED forever by design: the failure is the
    // story, and nothing claims it was fixed. So "finished" means no RUNNING and
    // no QUEUED left, not that everything succeeded.
    while (Date.now() - started < 30_000) {
      const current = await statuses(page, "workflow");
      for (const status of current) {
        seen.add(status);
      }
      if (current.includes("FAILED")) {
        sawFailure = true;
      }
      const inFlight = current.some(
        (status) => status === "RUNNING" || status === "QUEUED",
      );
      if (sawFailure && !inFlight) {
        break;
      }
      await page.waitForTimeout(400);
    }

    // Every state the story needs actually appeared.
    expect(seen.has("QUEUED")).toBe(true);
    expect(seen.has("RUNNING")).toBe(true);
    expect(seen.has("FAILED"), "the failure beat must be visible").toBe(true);
    expect(seen.has("DONE")).toBe(true);

    // It settles with nothing left mid-flight, and the failure still on display.
    const settled = await statuses(page, "workflow");
    expect(settled.length).toBeGreaterThan(0);
    expect(
      settled.some((status) => status === "RUNNING" || status === "QUEUED"),
    ).toBe(false);
    expect(settled).toContain("FAILED");

    // The verdict lands only after the flow resolves.
    await expect(page.getByText("That\u2019s the problem.")).toBeVisible();
    await expect(page.getByText("We\u2019re building Porcess.")).toBeVisible();
  });

  test("states every status as a word, never colour alone", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("#workflow").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);

    // The failure node is the one place colour carries meaning, so it must also
    // carry the word.
    const failed = page
      .locator("#workflow")
      .getByText("FAILED", { exact: true });
    await expect(failed.first()).toBeVisible();
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows the fully resolved flow immediately", async ({ page }) => {
      await page.goto("/");
      await page.locator("#workflow").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const current = await statuses(page, "workflow");
      expect(current.length).toBeGreaterThan(0);
      // Everything is already resolved: no half-finished story.
      expect(
        current.every((status) => status === "DONE" || status === "FAILED"),
      ).toBe(true);
      await expect(page.getByText("That\u2019s the problem.")).toBeVisible();
    });
  });
});

test.describe("the work graph branches", () => {
  test("one task becomes many, and they all converge", async ({ page }) => {
    await page.goto("/");
    await page.locator("#graph").scrollIntoViewIfNeeded();

    // The section renders, and its node labels are not headings: the diagram is
    // one image with an accessible name, so it does not pollute the outline.
    await expect(
      page.getByRole("heading", { name: "Nothing happens in isolation." }),
    ).toBeVisible();
    await expect(page.locator("#graph h3")).toHaveCount(0);

    const seen = await page.evaluate(async () => {
      const section = document.getElementById("graph");
      if (section === null) return [];
      const found = new Set<string>();
      const started = Date.now();
      while (Date.now() - started < 25_000) {
        for (const node of section.querySelectorAll("span")) {
          const text = node.textContent?.trim() ?? "";
          if (
            /^(SHIP|TEST|MARKET|DOCS|DEBUG|DISTRIBUTE|ITERATE|BUILD)$/.test(
              text,
            )
          ) {
            found.add(text);
          }
        }
        if (found.size >= 8) break;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      return [...found];
    });

    // The branch and the return leg both appear.
    for (const label of [
      "SHIP",
      "TEST",
      "MARKET",
      "DOCS",
      "ITERATE",
      "BUILD",
    ]) {
      expect(seen, `${label} should appear`).toContain(label);
    }
  });
});
