// Captures the social card from the real hero, so the Open Graph image is the
// actual design rather than a mock of it. Requires a running server:
//
//   pnpm build && pnpm start &
//   pnpm og:build
//
// Writes public/og.png at 2x for a 1200x630 card.

import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

const target = process.env.OG_TARGET ?? "http://127.0.0.1:3105";
const output = new URL("../public/og.png", import.meta.url);

await mkdir(new URL("../public/", import.meta.url), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
  // The card should always show the finished word and the full copy.
  reducedMotion: "reduce",
});

try {
  await page.goto(target, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-hero-ready="true"]', { timeout: 15000 });
  await page.screenshot({ path: output, fullPage: false });
  console.log(`wrote ${output.pathname}`);
} finally {
  await browser.close();
}
