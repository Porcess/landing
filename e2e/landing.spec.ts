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
    /** Per frame word geometry, so a shift on any frame can be caught. */
    __wordGeometry?: WordFrame[];
  }
}

interface WordFrame {
  width: number;
  left: number;
  top: number;
  seats: number[];
}

interface BeamSample {
  t: number;
  opacity: number;
  headPct: number;
  heightPx: number;
  widthPx: number;
  /** Per swapping seat: how much of the arriving letter is showing, where that
   *  cut falls across the word, and where the replaced letter's cut starts. The
   *  two cuts have to meet exactly. */
  cuts: ({ revealed: number; at: number; restingLeft: number | null } | null)[];
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

/**
 * The letters a reader actually sees, taken from the paint state rather than
 * from the markup or from the cuts. A glyph that is present in the document but
 * hidden is not a letter anyone reads, and a suite that only reads clips will
 * happily pass on a hero that spells "OR".
 */
function paintedWord(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-slot]"))
      .map((seat) =>
        Array.from(seat.querySelectorAll(".hero-glyph"))
          .filter((glyph) => getComputedStyle(glyph).visibility !== "hidden")
          .map((glyph) => glyph.textContent?.trim() ?? "")
          .join(""),
      )
      .join(""),
  );
}

/**
 * Reads what the hero word is actually showing, from the cuts rather than from
 * the markup: both glyphs of a swapping seat are always in the document, so
 * which letter is on screen is entirely a question of where the cut falls.
 */
function readWord(page: Page) {
  return page.evaluate(() => {
    const cut = (clip: string) => {
      const inner =
        /inset\(([^)]*)\)/.exec(clip)?.[1]?.trim().split(/\s+/) ?? [];
      return {
        right: Number.parseFloat(inner[1] ?? inner[0] ?? "0") || 0,
        left: Number.parseFloat(inner[3] ?? "0") || 0,
      };
    };

    const seats = Array.from(document.querySelectorAll("[data-slot]")).map(
      (seat) => {
        const arriving = seat.querySelector("[data-glyph='arriving']");
        const resting = seat.querySelector("[data-glyph='resting']");
        if (!arriving) {
          return {
            letter: resting?.textContent?.trim() ?? "",
            revealed: null,
            restingLeftInset: null,
          };
        }
        const a = cut(getComputedStyle(arriving).clipPath);
        const r = resting ? cut(getComputedStyle(resting).clipPath) : null;
        const revealed = 100 - a.right;
        return {
          letter:
            revealed > 50
              ? (arriving.textContent?.trim() ?? "")
              : (resting?.textContent?.trim() ?? ""),
          revealed,
          restingLeftInset: r?.left ?? null,
        };
      },
    );

    return { word: seats.map((seat) => seat.letter).join(""), seats };
  });
}

test.describe("hero", () => {
  test("lands on PORCESS with the copy revealed", async ({ page }) => {
    await openHero(page);

    // The two letters have changed places. Read three ways, because each one
    // alone can be fooled: from the cuts, from the paint, and from the word's
    // own text as a reader would take it.
    expect((await readWord(page)).word).toBe("PORCESS");
    expect(await paintedWord(page)).toBe("PORCESS");

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

  test("takes the replaced letter out of the paint, not out of the layout", async ({
    page,
  }) => {
    await openHero(page);

    // Two bugs live here. Clipping only the arriving letter leaves the replaced
    // one painted behind it, and a glyph is a ring, so the old letter's ink shows
    // through the new letter's counters. Removing the replaced letter instead is
    // worse: a seat is as wide as the wider of its two glyphs, so the word
    // narrowed and the whole title shifted on the last frame of the animation.
    // The replaced letter has to stay in the layout and out of the paint.
    const seats = await page.evaluate(() =>
      ["swap-left", "swap-right"].map((id) => ({
        id,
        glyphs: Array.from(
          document.querySelectorAll(`[data-slot='${id}'] .hero-glyph`),
        ).map((node) => ({
          char: node.textContent?.trim(),
          visibility: getComputedStyle(node).visibility,
          clip: getComputedStyle(node).clipPath,
        })),
      })),
    );

    // Both letters are still in the layout, so the seat keeps its width...
    expect(seats[0]?.glyphs.map((glyph) => glyph.char)).toEqual(["R", "O"]);
    expect(seats[1]?.glyphs.map((glyph) => glyph.char)).toEqual(["O", "R"]);

    // ...the replaced one is not painted...
    expect(seats[0]?.glyphs[0]?.visibility).toBe("hidden");
    expect(seats[1]?.glyphs[0]?.visibility).toBe("hidden");

    // ...the arriving one is, with no cut left across it: the settled word is a
    // word, not a word with a seam held open at zero width.
    expect(seats[0]?.glyphs[1]?.visibility).toBe("visible");
    expect(seats[1]?.glyphs[1]?.visibility).toBe("visible");
    for (const seat of seats) {
      const arriving = seat.glyphs[1];
      if (arriving === undefined) continue;
      const insets = (arriving.clip.match(/[\d.]+/g) ?? []).map(Number);
      // inset(top right bottom left), every edge open.
      for (const inset of insets) {
        expect(inset).toBe(0);
      }
    }

    // And the five seats that never changed are still painted. Hiding every
    // non-arriving glyph left the hero reading "OR", which no clip-based check
    // could see.
    expect(await paintedWord(page)).toBe("PORCESS");
  });

  test.describe("the word never moves", () => {
    for (const viewport of VIEWPORTS) {
      test(`holds its box at ${viewport.name}`, async ({ page }) => {
        // Every frame, from the settled font onwards, so the moment when the
        // word stops being an animation is included in the samples. Measured at
        // every breakpoint, because a width that only shifts on a narrow screen
        // is exactly the sort of thing one width of coverage misses.
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.addInitScript(() => {
          const frames: WordFrame[] = [];

          const start = () => {
            const tick = () => {
              const word = document.querySelector("[data-word]");
              if (word !== null) {
                const box = word.getBoundingClientRect();
                frames.push({
                  width: Math.round(box.width * 100) / 100,
                  left: Math.round(box.left * 100) / 100,
                  top: Math.round(box.top * 100) / 100,
                  seats: Array.from(
                    document.querySelectorAll("[data-slot]"),
                  ).map(
                    (seat) =>
                      Math.round(seat.getBoundingClientRect().width * 100) /
                      100,
                  ),
                });
              }
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          };

          // A fallback face has different advances, so measuring before the real
          // one arrives would only be measuring the wrong word.
          document.fonts.ready.then(start, start);
          window.__wordGeometry = frames;
        });

        await openHero(page);
        // Past the end of the animation, so the settled frames are sampled too.
        await page.waitForTimeout(1_200);

        const frames = await page.evaluate(() => window.__wordGeometry ?? []);
        expect(frames.length).toBeGreaterThan(50);

        const distinct = (values: number[]) => [...new Set(values)];
        const settled = frames[0];
        expect(settled).toBeDefined();

        for (const [what, values] of [
          ["width", frames.map((frame) => frame.width)],
          ["left edge", frames.map((frame) => frame.left)],
          ["top edge", frames.map((frame) => frame.top)],
        ] as const) {
          expect(
            distinct(values),
            `the word's ${what} must be the same on every frame, including the last`,
          ).toHaveLength(1);
        }

        const seatCount = settled?.seats.length ?? 0;
        expect(seatCount).toBe(7);
        for (let index = 0; index < seatCount; index += 1) {
          expect(
            distinct(frames.map((frame) => frame.seats[index] ?? 0)),
            `seat ${index} must keep one width`,
          ).toHaveLength(1);
        }
      });
    }
  });

  test("lights the builder roles one at a time", async ({ page }) => {
    await openHero(page);

    // Brightest role wins: the lit tone is near-white, the rest are muted.
    const litIndex = () =>
      page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll("[data-built-by] [data-role]"),
        );
        const glow = nodes.map((node) => {
          const channels = (
            getComputedStyle(node).color.match(/[\d.]+/g) ?? []
          ).map(Number);
          return (
            0.2126 * (channels[0] ?? 0) +
            0.7152 * (channels[1] ?? 0) +
            0.0722 * (channels[2] ?? 0)
          );
        });
        return glow.indexOf(Math.max(...glow));
      });

    const first = await litIndex();
    expect(first).toBeGreaterThanOrEqual(0);

    // The highlight moves on within a few beats...
    await expect.poll(() => litIndex(), { timeout: 15_000 }).not.toBe(first);

    // ...and once the 500ms color transition has settled, exactly one role
    // carries the lit tone and the rest share the dim one.
    await page.waitForTimeout(800);
    const tones = await page
      .locator("[data-built-by] [data-role]")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).color),
      );
    expect(new Set(tones).size).toBe(2);
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
      const inGlyph = measure(
        "[data-slot='swap-left'] [data-glyph='arriving']",
      );
      const outGlyph = measure(
        "[data-slot='swap-left'] [data-glyph='resting']",
      );
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
  test("is vertical, travels across the word, and is the edge the letters change at", async ({
    page,
  }) => {
    // Sampled every frame inside the page, because a single screenshot can
    // easily land before or after the pass and prove nothing.
    await page.addInitScript(() => {
      const samples: BeamSample[] = [];
      const start = performance.now();

      const cut = (clip: string) => {
        const inner =
          /inset\(([^)]*)\)/.exec(clip)?.[1]?.trim().split(/\s+/) ?? [];
        return {
          right: Number.parseFloat(inner[1] ?? inner[0] ?? "0") || 0,
          left: Number.parseFloat(inner[3] ?? "0") || 0,
        };
      };

      const tick = () => {
        const line = document.querySelector("[data-beam-line]");
        const word = document.querySelector("[data-word]");

        if (line !== null && word !== null) {
          const lineBox = line.getBoundingClientRect();
          const wordBox = word.getBoundingClientRect();

          // Where each swapping seat is cutting right now, in word percentages,
          // and how much of the replaced letter is still showing.
          const cuts = ["swap-left", "swap-right"].map((id) => {
            const seat = document.querySelector(`[data-slot='${id}']`);
            const arriving = seat?.querySelector("[data-glyph='arriving']");
            const resting = seat?.querySelector("[data-glyph='resting']");
            if (!seat || !arriving) return null;
            const seatBox = seat.getBoundingClientRect();
            const a = cut(getComputedStyle(arriving).clipPath);
            const revealed = 100 - a.right;
            return {
              revealed,
              // The replaced letter is cut away to the right of the same edge,
              // so the two must meet exactly: any overlap paints one over the
              // other's counters, and any gap leaves a slice of neither.
              restingLeft:
                resting === null || resting === undefined
                  ? null
                  : cut(getComputedStyle(resting).clipPath).left,
              at:
                ((seatBox.left -
                  wordBox.left +
                  (revealed / 100) * seatBox.width) /
                  wordBox.width) *
                100,
            };
          });

          samples.push({
            t: Math.round(performance.now() - start),
            opacity: Number(getComputedStyle(line).opacity),
            headPct: Math.round(
              ((lineBox.right - wordBox.left) / wordBox.width) * 100,
            ),
            heightPx: Math.round(lineBox.height),
            widthPx: Math.round(lineBox.width),
            cuts,
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

    // The letters change under the line, which is the whole point, and they
    // change *at* it: the cut edge is the line's own position on every frame
    // where a seat is mid change. If the cut were animated alongside the line
    // instead of derived from it, these two numbers would drift apart and
    // nothing else in the suite would notice.
    let midChange = 0;
    for (const sample of visible) {
      for (const cutAt of sample.cuts) {
        if (cutAt === null) continue;
        // Only while a seat is genuinely mid change: a seat that is entirely
        // hidden or entirely shown has no moving edge to compare.
        if (cutAt.revealed <= 0.5 || cutAt.revealed >= 99.5) continue;
        midChange += 1;
        expect(
          Math.abs(cutAt.at - sample.headPct),
          `the cut and the line are the same edge (line ${sample.headPct}%, cut ${cutAt.at}%)`,
        ).toBeLessThan(2.5);
        if (cutAt.restingLeft !== null) {
          expect(
            Math.abs(cutAt.revealed - cutAt.restingLeft),
            `the two letters must meet exactly (new letter shows to ${cutAt.revealed}%, old letter starts at ${cutAt.restingLeft}%)`,
          ).toBeLessThan(1);
        }
      }
    }
    expect(
      midChange,
      "the seats should have been caught mid change",
    ).toBeGreaterThan(0);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("still plays the sweep, just quieter and without travel", async ({
    page,
  }) => {
    await openHero(page);

    // The word ends up changed...
    expect(await paintedWord(page)).toBe("PORCESS");
    expect((await readWord(page)).word).toBe("PORCESS");

    // ...the copy is readable...
    expect(await opacity(page, "[data-reveal] >> nth=0")).toBe(1);

    // ...and nothing moved to get there. The change is a cut, not a slide, so
    // no glyph carries a transform at all.
    const offsets = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-slot] .hero-glyph")).map(
        (node) => getComputedStyle(node).transform,
      ),
    );
    expect(offsets.length).toBeGreaterThan(0);
    for (const transform of offsets) {
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    }

    await page.screenshot({ path: `${SHOTS}/reduced-motion.png` });
  });

  test("still moves the highlight, but without the fade", async ({ page }) => {
    await openHero(page);

    // Reduced motion spares the transition, not the highlight. The color still
    // moves along the byline; it just arrives at once instead of easing in over
    // half a second.
    const lit = () =>
      page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll("[data-built-by] [data-role]"),
        );
        const glow = nodes.map((node) => {
          const channels = (
            getComputedStyle(node).color.match(/[\d.]+/g) ?? []
          ).map(Number);
          return (
            0.2126 * (channels[0] ?? 0) +
            0.7152 * (channels[1] ?? 0) +
            0.0722 * (channels[2] ?? 0)
          );
        });
        return glow.indexOf(Math.max(...glow));
      });

    const first = await lit();
    await expect.poll(lit, { timeout: 15_000 }).not.toBe(first);

    // Exactly one role carries the lit tone, and no role carries a fade.
    const durations = await page
      .locator("[data-built-by] [data-role]")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).transitionDuration),
      );
    expect(durations.length).toBeGreaterThan(0);
    for (const duration of durations) {
      expect(duration).toBe("0s");
    }

    const tones = await page
      .locator("[data-built-by] [data-role]")
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).color),
      );
    expect(new Set(tones).size).toBe(2);
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

  test("keeps advancing while the pointer rests over it", async ({ page }) => {
    await page.goto("/");
    await page.locator("#problems").scrollIntoViewIfNeeded();

    // A reader's cursor sits mid-viewport while they scroll, which puts it over
    // a section this tall almost by accident. An earlier revision paused the
    // rotation on hover for that reason and it froze permanently, which read as
    // a broken carousel. It must keep moving with the pointer resting on it.
    await page.locator("#problems").hover();

    const before = await visibleIndex(page);
    await expect
      .poll(() => visibleIndex(page), { timeout: 15_000 })
      .not.toBe(before);
  });

  test("advances at roughly a three second cadence", async ({ page }) => {
    await page.goto("/");
    await page.locator("#problems").scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);

    // Time one full advance, then assert it is in the right neighbourhood. The
    // bounds are wide on purpose: this guards against a cadence that drifted
    // back to "too slow to notice", not against a few hundred milliseconds.
    const started = Date.now();
    const first = await visibleIndex(page);
    let elapsed = 0;

    while (Date.now() - started < 12_000) {
      if ((await visibleIndex(page)) !== first) {
        elapsed = Date.now() - started;
        break;
      }
      await page.waitForTimeout(100);
    }

    expect(
      elapsed,
      "the statement should change within the cadence",
    ).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5_000);
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

  test("at lg the wide node labels stay inside their cards", async ({
    page,
  }) => {
    // Regression: at `md` widths the design-space node boxes rendered too
    // narrow for labels like DISTRIBUTE, which bled past the card border. The
    // wide composition now starts at `lg`, so the smallest wide viewport must
    // keep every label inside its box.
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    await page.locator("#workflow").scrollIntoViewIfNeeded();
    await expect(page.getByText("That\u2019s the problem.")).toBeVisible({
      timeout: 30_000,
    });

    // The graph has no verdict line, so wait until its beats have played far
    // enough for every node to be present before measuring.
    await page.locator("#graph").scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const section = document.getElementById("graph");
            if (section === null) {
              throw new Error("missing #graph");
            }
            return Array.from(section.querySelectorAll("div.absolute")).filter(
              (node) => node.getBoundingClientRect().width > 0,
            ).length;
          }),
        { timeout: 30_000 },
      )
      .toBe(8);

    const bleeds = await page.evaluate(() => {
      const out: string[] = [];
      for (const id of ["workflow", "graph"]) {
        const section = document.getElementById(id);
        if (section === null) {
          throw new Error(`missing #${id}`);
        }
        for (const node of section.querySelectorAll("div.absolute span")) {
          const box = node.getBoundingClientRect();
          if (box.width === 0) {
            continue;
          }
          if (node.scrollWidth - node.clientWidth > 1) {
            out.push(`${id}: ${node.textContent?.trim()}`);
          }
        }
      }
      return out;
    });
    expect(bleeds).toEqual([]);
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

test.describe("the role reel", () => {
  /** The role currently lit. */
  const litRole = (page: Page) =>
    page.evaluate(() => {
      const node = document.querySelector("[data-reel-lit='true']");
      return node === null ? null : (node.textContent ?? "").trim();
    });

  /** The track's current vertical translation, in pixels. */
  const trackY = (page: Page) =>
    page.evaluate(() => {
      const track = document.querySelector("[data-role-reel-track]");
      if (track === null) {
        return null;
      }
      const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
      return Math.round(matrix.m42 * 100) / 100;
    });

  test("is actually travelling, not parked", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-role-reel]").scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);

    const start = await trackY(page);
    expect(start).not.toBeNull();

    // Sampled over several beats: the track must have moved a real distance, not
    // merely re-rendered. This is the assertion that fails if the reel is
    // static, which is exactly the regression this test exists for.
    const samples: number[] = [];
    for (let i = 0; i < 14; i += 1) {
      samples.push((await trackY(page)) ?? 0);
      await page.waitForTimeout(250);
    }

    const travelled = Math.max(...samples) - Math.min(...samples);
    expect(
      travelled,
      "the track should move a visible distance",
    ).toBeGreaterThan(40);
  });

  test("lights exactly one role at a time and cycles in order", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-role-reel]").scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);

    // Collect the lit role over several full cycles, collapsing repeats.
    const seen: string[] = [];
    const started = Date.now();
    while (Date.now() - started < 24_000) {
      const role = await litRole(page);
      if (role !== null && role !== seen[seen.length - 1]) {
        seen.push(role);
      }
      await page.waitForTimeout(120);
    }

    expect(seen.length, "several roles should have been lit").toBeGreaterThan(
      4,
    );

    // Exactly one lit at any moment.
    const litCount = await page.evaluate(
      () => document.querySelectorAll("[data-reel-lit='true']").length,
    );
    expect(litCount).toBe(1);

    // The sequence is a clean cycle: each role follows its predecessor, and the
    // wrap back to the first never skips or repeats one. That is what proves the
    // loop snap is silent rather than a visible reset that loses a word.
    const cycle = [
      "developer",
      "founder",
      "creator",
      "marketer",
      "student",
      "designer",
    ];
    for (let i = 1; i < seen.length; i += 1) {
      const previous = cycle.indexOf(seen[i - 1] ?? "");
      const current = cycle.indexOf(seen[i] ?? "");
      expect(current, `${seen[i - 1]} should be followed by ${seen[i]}`).toBe(
        (previous + 1) % cycle.length,
      );
    }
  });

  test("keeps a constant height so nothing below it shifts", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-role-reel]").scrollIntoViewIfNeeded();

    const measure = () =>
      page.evaluate(() => {
        const reel = document.querySelector("[data-role-reel]");
        const heading = document.querySelector("#teaser h2");
        if (reel === null || heading === null) return null;
        return {
          reelHeight: Math.round(reel.getBoundingClientRect().height),
          headingTop: Math.round(heading.getBoundingClientRect().top),
        };
      });

    const first = await measure();
    await page.waitForTimeout(4_000);
    const later = await measure();

    expect(first).not.toBeNull();
    expect(later).not.toBeNull();
    expect(later?.reelHeight).toBe(first?.reelHeight);
    expect(later?.headingTop).toBe(first?.headingTop);
  });

  test("does not clip the longest role at desktop widths", async ({ page }) => {
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.locator("[data-role-reel]").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);

      const fit = await page.evaluate(() => {
        const reel = document.querySelector("[data-role-reel]");
        if (reel === null) return null;

        // Measured from the text node, not the element box. A flex item whose
        // text is wider than its container still reports the container's width,
        // so the box would happily claim to fit while the word spilled out.
        let widest = 0;
        for (const word of reel.querySelectorAll(".role-reel-word")) {
          const text = word.firstChild;
          if (text === null || text.nodeType !== Node.TEXT_NODE) continue;
          const range = document.createRange();
          range.selectNodeContents(text);
          widest = Math.max(widest, range.getBoundingClientRect().width);
        }

        return {
          reel: reel.getBoundingClientRect().width,
          widest,
          // Every role must sit on one line: a wrapped word would change a row's
          // height and break the reel's rhythm.
          anyWrapped: Array.from(reel.querySelectorAll(".role-reel-word")).some(
            (word) =>
              word.getBoundingClientRect().height >
              parseFloat(getComputedStyle(word).fontSize) * 1.5,
          ),
        };
      });

      expect(fit).not.toBeNull();
      // 1.05 is the lit word's scale. A word that exceeds the reel would be cut
      // off by the reel's own overflow.
      expect(
        (fit?.widest ?? 0) * 1.05,
        `longest role should fit inside the reel at ${width}px`,
      ).toBeLessThan(fit?.reel ?? 0);
      expect(fit?.anyWrapped, `no role should wrap at ${width}px`).toBe(false);

      // And the page itself never gains a horizontal scrollbar.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(
        overflow,
        `no horizontal overflow at ${width}px`,
      ).toBeLessThanOrEqual(0);
    }
  });

  test("the lit role is the brightest, and the rest fade with distance", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("[data-role-reel]").scrollIntoViewIfNeeded();

    const readTones = () =>
      page.evaluate(() => {
        const reel = document.querySelector("[data-role-reel]");
        if (reel === null) return null;
        return Array.from(reel.querySelectorAll(".role-reel-word"))
          .map((word) => ({
            opacity: Number(getComputedStyle(word).opacity),
            lit: word.getAttribute("data-reel-lit") === "true",
          }))
          .filter((entry) => entry.opacity > 0);
      });

    // Sampled across a beat rather than at one instant: the tones are mid
    // transition for part of every cycle, so a single reading would be a coin
    // toss. The invariant that must hold at every moment is the ordering.
    let peak = 0;
    for (let i = 0; i < 10; i += 1) {
      const tones = await readTones();
      expect(tones).not.toBeNull();

      const lit = (tones ?? []).filter((entry) => entry.lit);
      const dim = (tones ?? []).filter((entry) => !entry.lit);

      // Exactly one role is lit at any moment.
      expect(lit, "one role is lit").toHaveLength(1);

      const litOpacity = lit[0]?.opacity ?? 0;
      peak = Math.max(peak, litOpacity);

      // The lit role is never dimmer than another visible role, including while
      // the crossfade is in flight.
      for (const entry of dim) {
        expect(litOpacity).toBeGreaterThanOrEqual(entry.opacity - 0.02);
      }

      await page.waitForTimeout(160);
    }

    // And at the top of its beat it reaches full ink.
    expect(peak).toBeGreaterThan(0.99);

    // Progressive: the nearest neighbour is brighter than the farthest one.
    const spread = (await readTones()) ?? [];
    const sorted = spread
      .map((entry) => entry.opacity)
      .filter((opacity) => opacity > 0 && opacity < 0.99)
      .sort((a, b) => b - a);
    expect(sorted.length).toBeGreaterThan(1);
    expect(sorted[0]).toBeGreaterThan(sorted[sorted.length - 1] ?? 0);
  });

  test("keeps the duplicated track out of the accessibility tree", async ({
    page,
  }) => {
    await page.goto("/");

    // The reel prints the list three times over for the eye's sake. The roles
    // are read out once, from a real list, instead of eighteen times.
    await expect(page.locator("[data-role-reel='live']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(page.locator("#teaser ul.sr-only li")).toHaveCount(6);
    expect(await page.locator("#teaser ul.sr-only li").allInnerTexts()).toEqual(
      ["developer", "founder", "creator", "marketer", "student", "designer"],
    );
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows every role at once, with nothing moving", async ({ page }) => {
      await page.goto("/");

      // The server cannot know the preference, so it ships the reel and the
      // variant is chosen on hydration. Wait for the swap before measuring.
      const reel = page.locator("[data-role-reel='static']");
      await expect(reel).toBeVisible();
      await reel.scrollIntoViewIfNeeded();

      // All six are present and readable, at full tone.
      const words = await reel.locator(".role-reel-word").evaluateAll((nodes) =>
        nodes.map((word) => ({
          text: (word.textContent ?? "").trim(),
          opacity: Number(getComputedStyle(word).opacity),
        })),
      );

      expect(words).toHaveLength(6);
      for (const word of words) {
        expect(word.opacity).toBe(1);
      }

      // No track, so nothing travels.
      await expect(page.locator("[data-role-reel-track]")).toHaveCount(0);
      expect(await litRole(page)).toBeNull();

      // And it stays still.
      const before = await reel.innerHTML();
      await page.waitForTimeout(3_000);
      expect(await reel.innerHTML()).toBe(before);
    });

    test("exposes the roles as content rather than decoration", async ({
      page,
    }) => {
      await page.goto("/");

      const reel = page.locator("[data-role-reel='static']");
      await expect(reel).toBeVisible();

      // This variant is a real list, so it is neither hidden from assistive
      // technology nor duplicated beside itself.
      await expect(reel).not.toHaveAttribute("aria-hidden", "true");
      await expect(reel.locator("li")).toHaveCount(6);
      await expect(page.locator("#teaser ul.sr-only")).toHaveCount(0);
    });
  });
});
