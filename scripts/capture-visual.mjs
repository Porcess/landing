// Visual proof: captures the hero pass frame by frame and the problems
// carousel, in both motion modes.
//
// Each frame gets a fresh page load, and screenshots are taken with
// `animations: "allow"`. Playwright disables animations for screenshots by
// default, which silently fast-forwards them to their end state: that is what
// produced a run of screenshots showing the line already parked and at zero
// opacity, and it is a bug in the measurement, not in the page.
import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

const target = process.env.SHOT_TARGET ?? "http://127.0.0.1:3105";
const out = "test-results/visual";
await mkdir(out, { recursive: true });

const browser = await chromium.launch();

/** Opens the page and returns once the pass is under way at `at` ms. */
async function openAt(browser, mode, at) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: mode,
  });
  const page = await context.newPage();

  // Record what the line is doing, from inside the page.
  await page.addInitScript(() => {
    window.__line = { opacity: 0, head: 0, width: 0, height: 0 };
    const tick = () => {
      const line = document.querySelector("[data-beam-line]");
      const word = document.querySelector("[data-word]");
      if (line && word) {
        const lineBox = line.getBoundingClientRect();
        const wordBox = word.getBoundingClientRect();
        window.__line = {
          opacity: Number(getComputedStyle(line).opacity),
          head: Math.round(
            ((lineBox.right - wordBox.left) / wordBox.width) * 100,
          ),
          width: Math.round(lineBox.width),
          height: Math.round(lineBox.height),
        };
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const started = Date.now();
  await page.goto(target, { waitUntil: "domcontentloaded" });
  const remaining = at - (Date.now() - started);
  if (remaining > 0) {
    await page.waitForTimeout(remaining);
  }

  return { context, page };
}

for (const mode of ["no-preference", "reduce"]) {
  const marks = mode === "reduce"
    ? [700, 1000, 1300, 1600, 2000, 2600]
    : [600, 1000, 1400, 1800, 2200, 2600, 3000, 3400, 3900, 4600];

  console.log(`=== hero (${mode}) ===`);
  for (const at of marks) {
    const { context, page } = await openAt(browser, mode, at);
    const state = await page.evaluate(() => window.__line);
    await page.screenshot({
      path: `${out}/hero-${mode}-${String(at).padStart(4, "0")}.png`,
      animations: "allow",
      clip: { x: 0, y: 140, width: 1440, height: 420 },
    });
    console.log(
      `  ${at}ms  opacity=${state.opacity.toFixed(2)}  head=${state.head}%  ${state.width}x${state.height}px`,
    );
    await context.close();
  }
}

for (const mode of ["no-preference", "reduce"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: mode,
  });
  const page = await context.newPage();
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-hero-ready="true"]', { timeout: 20000 });
  await page.locator("#problems").scrollIntoViewIfNeeded();

  console.log(`=== problems (${mode}) ===`);
  for (const at of [0, 2600, 5200]) {
    await page.waitForTimeout(at === 0 ? 300 : 2600);
    await page.locator("#problems").screenshot({
      path: `${out}/problems-${mode}-${at}.png`,
      animations: "allow",
    });
    const shot = await page.evaluate(() => ({
      listItems: document.querySelectorAll("#problems li").length,
      opacities: Array.from(document.querySelectorAll("#problems h3")).map((n) =>
        Number(getComputedStyle(n.parentElement ?? n).opacity).toFixed(2),
      ),
    }));
    console.log(`  t=${at}ms  li=${shot.listItems}  [${shot.opacities.join(", ")}]`);
  }

  await context.close();
}

await browser.close();
console.log("wrote", out);
