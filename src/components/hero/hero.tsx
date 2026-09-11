"use client";

import { motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { EASE_ENTER, EASE_SETTLE, EASE_SWEEP } from "@/lib/motion";

/**
 * The signature moment: a hairline sweeps across the word and the two letters
 * it crosses change places.
 *
 * How the swap stays seamless. Each of the two middle letters is a stack of two
 * glyphs inside one grid cell, and the cell is as wide as the wider glyph, so
 * the word is exactly as wide as it will be finished no matter which letter is
 * showing. The five letters that never move are never touched, which is why
 * nothing reflows and nothing flickers.
 *
 * A swapping letter is drawn twice, once in the slot it leaves and once in the
 * slot it arrives at. Both copies travel the identical path between those two
 * seats (equal duration, equal easing, one offset by exactly one slot width),
 * and their opacities sum to one at every moment. The result is
 * indistinguishable from a single glyph in flight, so the only thing the eye
 * sees is a letter crossing to the other seat, rising while the letter moving
 * the other way dips underneath it.
 */

const HOLD_MS = 500;
/**
 * The pass is deliberately slow. The line has to be on screen long enough to
 * read as something travelling across the word, and the letters have to change
 * while it is over them rather than after it has gone by.
 */
const SWEEP_MS = 2800;
/**
 * When the change fires, as a fraction of the sweep. The line travels from just
 * off the left edge to just off the right, so this fraction puts it over the two
 * middle letters, which is where the change has to happen for the line to look
 * like the cause of it.
 */
const SWAP_AT = 0.33;
const SWAP_MS = 800;
const SETTLE_MS = 250;
const REVEAL_STAGGER_MS = 70;

/** Travel endpoints, as a fraction of the word's own width. */
const SWEEP_FROM = -1.08;
const SWEEP_TO = 0.08;

const REVEAL_EASE = EASE_ENTER;
/** Smoothstep: gentle at both ends, so the line never jerks into motion. */
const SWEEP_EASE = EASE_SWEEP;
/**
 * A long decelerate with no overshoot. Overshoot reads as a bounce rather than a
 * settle, which is what made the earlier pass feel abrupt.
 */
const SWAP_EASE = EASE_SETTLE;

/** One seat of travel, and the small vertical drift each letter takes. */
const TRAVEL = "88%";
const LANE = "7%";

type Glyph = { char: string; shown: boolean; role: string | null };
type Slot = { id: string; glyphs: Glyph[] };

const SLOTS: Slot[] = [
  { id: "p", glyphs: [{ char: "P", shown: true, role: null }] },
  {
    id: "swap-left",
    glyphs: [
      { char: "O", shown: false, role: "o-in" },
      { char: "R", shown: true, role: "r-out" },
    ],
  },
  {
    id: "swap-right",
    glyphs: [
      { char: "R", shown: false, role: "r-in" },
      { char: "O", shown: true, role: "o-out" },
    ],
  },
  { id: "c", glyphs: [{ char: "C", shown: true, role: null }] },
  { id: "e", glyphs: [{ char: "E", shown: true, role: null }] },
  { id: "s1", glyphs: [{ char: "S", shown: true, role: null }] },
  { id: "s2", glyphs: [{ char: "S", shown: true, role: null }] },
];

/** The two glyphs leaving and the two arriving, matched as groups. */
const MOVING_OUT = "[data-swap$='-out']";
const MOVING_IN = "[data-swap$='-in']";
const BEAM = "[data-beam]";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function Hero() {
  const [scope, animate] = useAnimate();
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const root = scope.current as HTMLElement | null;
    if (root === null || startedRef.current) {
      return;
    }
    startedRef.current = true;

    let cancelled = false;
    /**
     * Read here rather than from a subscription. This effect is one shot, so a
     * preference that arrives one render late would let the full animation play
     * for someone who asked for no motion.
     */
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const reveal = async () => {
      const items = Array.from(
        root.querySelectorAll<HTMLElement>("[data-reveal]"),
      );
      await Promise.all(
        items.map((item, index) =>
          animate(
            item,
            { opacity: 1, y: 0 },
            {
              duration: 0.55,
              delay: (index * REVEAL_STAGGER_MS) / 1000,
              ease: REVEAL_EASE,
            },
          ),
        ),
      );
    };

    const run = async () => {
      /**
       * Every visitor sees the word change. Reduced motion shortens the pass and
       * removes the travel; it does not remove the moment. Dropping the sequence
       * entirely meant the word was already spelled "PORCESS" on arrival, which
       * is indistinguishable from a broken animation.
       */
      const sweepMs = reduceMotion ? 1600 : SWEEP_MS;
      const swapMs = reduceMotion ? 500 : SWAP_MS;

      await wait(HOLD_MS);
      if (cancelled) {
        return;
      }

      const word = root.querySelector<HTMLElement>("[data-word]");
      const width = word?.getBoundingClientRect().width ?? 0;
      if (width === 0) {
        // No measurable word means nothing to sweep across. Reveal the copy
        // rather than leaving it hidden behind an animation that cannot run.
        await reveal();
        setReady(true);
        return;
      }

      // With travel, the arriving glyphs are parked one seat away while still
      // invisible, so their flight is the exact mirror of the glyphs leaving.
      if (!reduceMotion) {
        animate(
          "[data-swap='r-in']",
          { x: `-${TRAVEL}`, y: `-${LANE}` },
          { duration: 0 },
        );
        animate("[data-swap='o-in']", { x: TRAVEL, y: LANE }, { duration: 0 });
      }

      const beam = animate(
        BEAM,
        {
          // Pixels, not percentages: these elements are a pixel or two wide, so
          // a percentage would resolve against the line itself and move it by
          // about two pixels instead of across the word.
          x: [width * SWEEP_FROM, width * SWEEP_TO],
          // Held at full strength for most of the pass so the line stays visible
          // while it is crossing the letters, and only fades as it leaves the
          // word behind. The long ramps are what keep the fade from reading as a
          // flicker.
          opacity: [0, 1, 1, 0],
        },
        {
          duration: sweepMs / 1000,
          ease: SWEEP_EASE,
          times: [0, 0.18, 0.78, 1],
        },
      );

      await wait(sweepMs * SWAP_AT);
      if (cancelled) {
        return;
      }

      if (reduceMotion) {
        // A plain crossfade in place: the letters still change while the line is
        // over them, they just do not travel between seats.
        await Promise.all([
          animate(
            MOVING_OUT,
            { opacity: 0 },
            { duration: swapMs / 1000, ease: "easeInOut" },
          ),
          animate(
            MOVING_IN,
            { opacity: 1 },
            { duration: swapMs / 1000, ease: "easeInOut" },
          ),
        ]);
      } else {
        await Promise.all([
          animate(
            "[data-swap='r-out']",
            { x: TRAVEL, y: `-${LANE}`, opacity: 0 },
            { duration: swapMs / 1000, ease: SWAP_EASE },
          ),
          animate(
            "[data-swap='r-in']",
            { x: "0%", y: "0%", opacity: 1 },
            { duration: swapMs / 1000, ease: SWAP_EASE },
          ),
          animate(
            "[data-swap='o-out']",
            { x: `-${TRAVEL}`, y: LANE, opacity: 0 },
            { duration: swapMs / 1000, ease: SWAP_EASE },
          ),
          animate(
            "[data-swap='o-in']",
            { x: "0%", y: "0%", opacity: 1 },
            { duration: swapMs / 1000, ease: SWAP_EASE },
          ),
        ]);

        if (cancelled) {
          return;
        }

        // Clear the travel offsets from the finished glyphs. They are invisible
        // by now, and leaving a translated box behind is what would add phantom
        // width on a narrow screen.
        animate(MOVING_OUT, { x: "0%", y: "0%" }, { duration: 0 });
      }

      await Promise.all([beam, wait(reduceMotion ? 0 : SETTLE_MS)]);
      if (cancelled) {
        return;
      }

      await reveal();
      if (cancelled) {
        return;
      }

      // Park the line back at rest. It is invisible by now, and a translated box
      // would otherwise add phantom scroll width to the page.
      animate(BEAM, { x: 0 }, { duration: 0 });

      setReady(true);
      track("hero_animation_complete", { reduced_motion: reduceMotion });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [animate, scope]);

  return (
    <section
      className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden pt-20 pb-16 sm:pt-24"
      data-hero-ready={ready ? "true" : undefined}
      ref={scope}
    >
      <Container>
        <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
          {siteCopy.hero.eyebrow}
        </p>

        {/* The heading is the brand sentence, once, for assistive technology
            and crawlers. The animated word below is presentation of it, which
            is why the two are separate elements: a stack of glyphs that change
            places would otherwise be read out twice over. */}
        <h1 className="sr-only">{siteCopy.hero.headline}</h1>

        <div
          aria-hidden="true"
          className="mt-3 font-display font-semibold sm:mt-4"
        >
          {/* `isolate` bounds the line's blending to this word, so it can never
              reach the header or anything else on the page. */}
          <span
            className="relative isolate inline-flex text-display text-ink"
            data-word
          >
            {SLOTS.map((slot) => (
              <span className="inline-grid" data-slot={slot.id} key={slot.id}>
                {slot.glyphs.map((glyph) => (
                  <span
                    className="col-start-1 row-start-1"
                    data-swap={glyph.role ?? undefined}
                    key={glyph.char}
                    style={{ opacity: glyph.shown ? 1 : 0 }}
                  >
                    {glyph.char}
                  </span>
                ))}
              </span>
            ))}

            {/* The scan line and the faint wash trailing it. Both sit at the
                word's right edge, so translating them carries the line in from
                off the left and out past the right. Nothing may wrap them: an
                opacity or transform on an ancestor would isolate their blending
                and the line would vanish wherever it crossed a stroke. */}
            <span
              className="hero-scan-tail pointer-events-none absolute inset-y-0 right-0.5 w-16 opacity-0"
              data-beam
            />
            <span
              className="hero-scan pointer-events-none absolute -inset-y-2 right-0 w-px opacity-0"
              data-beam
              data-beam-line
            />
          </span>
        </div>

        <div className="mt-8 sm:mt-10">
          <motion.p
            className="max-w-measure font-display text-lead font-medium text-ink"
            data-reveal
            initial={{ opacity: 0, y: 14 }}
          >
            {siteCopy.hero.question}
          </motion.p>
          <motion.p
            className="mt-3 max-w-measure text-lead text-ink-muted"
            data-reveal
            initial={{ opacity: 0, y: 14 }}
          >
            {siteCopy.hero.hook}
          </motion.p>
        </div>

        <motion.div
          className="mt-8 max-w-xl sm:mt-10"
          data-reveal
          initial={{ opacity: 0, y: 14 }}
        >
          <EarlyAccessForm placement="hero" showPromise />
        </motion.div>
      </Container>
    </section>
  );
}
