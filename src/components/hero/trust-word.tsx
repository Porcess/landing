"use client";

import { motion, useAnimate, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { EASE_SWEEP } from "@/lib/motion";

/**
 * The signature moment: a hairline crosses the word and rewrites the two letters
 * it passes over, so TRUST THE PROCESS settles as TRUST THE PORCESS.
 *
 * HOW THE LETTERS CHANGE
 *
 * Each of the two middle seats holds the letter it is showing and the letter
 * arriving, stacked in the same cell. Both are clipped by a horizontal cut whose
 * edge is the line's own position: the arriving letter is shown to the left of
 * the cut and the letter it replaces to the right. The line does not pass while
 * the letters change near it; the line is the edge doing the changing.
 *
 * BOTH LETTERS HAVE TO BE CLIPPED, NOT JUST THE NEW ONE
 *
 * A glyph is a ring, not a filled box. Clipping only the arriving letter leaves
 * the outgoing one painted behind it in full, and its ink shows through the
 * counter of the letter covering it: an O with the legs of the R visible inside
 * it, which reads as a third letter that is neither. Clipping the two to
 * complementary halves means the two are never painted in the same place at all.
 *
 * WHY NOTHING MOVES
 *
 * Both glyphs share a single grid cell, so a seat is as wide as the wider of the
 * two and the word's box is the same before, during and after the change.
 * Nothing reflows, so nothing on the page shifts.
 */

/** A beat with the word already spelled, before the line enters. */
const HOLD_MS = 620;
const SWEEP_MS = 2900;
const SETTLE_MS = 240;

/** Travel endpoints, as a fraction of the word's own width. */
const SWEEP_FROM = -0.08;
const SWEEP_TO = 1.08;

const SWEEP_EASE = EASE_SWEEP;

/** The seats the line rewrites, left to right. */
const SWAPPING: readonly string[] = ["swap-left", "swap-right"];

type Seat = {
  id: string;
  /** The letter shown, and in a two glyph seat, the letter that arrives. */
  glyphs: readonly string[];
};

/** P, R, O, C, E, S, S. The two middle seats change places. */
const SEATS: readonly Seat[] = [
  { id: "p", glyphs: ["P"] },
  { id: "swap-left", glyphs: ["R", "O"] },
  { id: "swap-right", glyphs: ["O", "R"] },
  { id: "c", glyphs: ["C"] },
  { id: "e", glyphs: ["E"] },
  { id: "s1", glyphs: ["S"] },
  { id: "s2", glyphs: ["S"] },
];

/** Fully clipped, so a letter is invisible until the line reaches it. */
const HIDDEN = "inset(0 100% 0 0)";
const SHOWN = "inset(0 0 0 0)";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function TrustWord({
  animateOnMount = true,
}: {
  animateOnMount?: boolean;
}) {
  const [scope, animate] = useAnimate();
  const [swapped, setSwapped] = useState(false);
  const startedRef = useRef(false);

  const progress = useMotionValue(0);
  /**
   * Each swapping seat's left and right edge, as a fraction of the word. Read by
   * the cuts on every frame, so it lives in a ref rather than in state: the
   * measurement must not cause a render, and the cuts must not wait for one.
   */
  const spans = useRef<({ left: number; right: number } | null)[]>([
    null,
    null,
  ]);

  /** The line's own position, as a fraction of the word, on this frame. */
  const lineAt = (value: number) =>
    SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * value;

  /**
   * How much of a seat the line has crossed, which is exactly how much of the
   * arriving letter to show. The cut and the line are the same edge.
   */
  const crossedAt = (index: number, value: number): number | null => {
    const span = spans.current[index];
    if (span === null || span === undefined) {
      return null;
    }
    const crossed = (lineAt(value) - span.left) / (span.right - span.left);
    return Math.min(1, Math.max(0, crossed));
  };

  /** The arriving letter, shown to the left of the cut. */
  const arrivingClip = (index: number, value: number) => {
    const crossed = crossedAt(index, value);
    if (crossed === null) {
      return HIDDEN;
    }
    return crossed >= 1
      ? SHOWN
      : `inset(0 ${((1 - crossed) * 100).toFixed(3)}% 0 0)`;
  };

  /**
   * The letter being replaced, shown to the right of the cut. Clipping only the
   * arriving letter is not enough: this one would still be painted behind it and
   * would show through the counters.
   */
  const restingClip = (index: number, value: number) => {
    const crossed = crossedAt(index, value);
    if (crossed === null) {
      return SHOWN;
    }
    return crossed <= 0 ? SHOWN : `inset(0 0 0 ${(crossed * 100).toFixed(3)}%)`;
  };

  const cuts = [
    {
      arriving: useTransform(progress, (value) => arrivingClip(0, value)),
      resting: useTransform(progress, (value) => restingClip(0, value)),
    },
    {
      arriving: useTransform(progress, (value) => arrivingClip(1, value)),
      resting: useTransform(progress, (value) => restingClip(1, value)),
    },
  ];

  // Percentages, not pixels: the carrier is exactly as wide as the word, so a
  // percentage of it is a position within the word and nothing needs measuring.
  const sweepX = useTransform(progress, (value) => `${lineAt(value) * 100}%`);

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
    const reduceMotion =
      !animateOnMount ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = async () => {
      // The word's geometry is what decides where the cuts fall, so it has to be
      // measured against the font that will actually be used. A fallback face
      // has different advances, and measuring before the swap would put the cuts
      // in the wrong place for the rest of the page's life.
      await document.fonts.ready;
      if (cancelled) {
        return;
      }

      const word = root.querySelector<HTMLElement>("[data-word]");
      const width = word?.getBoundingClientRect().width ?? 0;
      if (word === null || width === 0) {
        // No measurable word means nothing to cross. The word still has to end
        // up spelled, so reveal every arriving letter and move on.
        progress.set(1);
        setSwapped(true);
        return;
      }

      const wordLeft = word.getBoundingClientRect().left;
      spans.current = SWAPPING.map((id) => {
        const seat = root.querySelector<HTMLElement>(`[data-slot='${id}']`);
        if (seat === null) {
          return null;
        }
        const box = seat.getBoundingClientRect();
        return {
          left: (box.left - wordLeft) / width,
          right: (box.right - wordLeft) / width,
        };
      });

      await wait(reduceMotion ? 0 : HOLD_MS);
      if (cancelled) {
        return;
      }

      // The line's travel and its fade run on one clock. The fade is weighted to
      // the very ends of the crossing, so the line is at full strength while it
      // is over the letters and neither ramp is long enough to read as a flicker.
      await Promise.all([
        animate(progress, 1, {
          duration: (reduceMotion ? 1200 : SWEEP_MS) / 1000,
          ease: SWEEP_EASE,
        }),
        animate(
          "[data-beam-line]",
          { opacity: reduceMotion ? [0, 1, 0] : [0, 1, 1, 0] },
          {
            duration: (reduceMotion ? 1200 : SWEEP_MS) / 1000,
            ease: "linear",
            times: reduceMotion ? [0, 0.5, 1] : [0, 0.03, 0.9, 1],
          },
        ),
      ]);
      if (cancelled) {
        return;
      }

      await wait(reduceMotion ? 0 : SETTLE_MS);
      if (cancelled) {
        return;
      }

      // The word stops being an animation. The letters that were replaced are
      // dropped from the document and the cuts come off, leaving an ordinary
      // word. That is also what keeps the result honest for assistive tech: a
      // replaced letter that is merely covered by clip is a text node nobody can
      // see or measure, which reads to an auditor as unreadable text rather than
      // as absent text.
      setSwapped(true);
      track("hero_animation_complete", { reduced_motion: reduceMotion });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [animate, animateOnMount, progress, scope]);

  return (
    <span className="hero-word" data-word ref={scope}>
      {SEATS.map((seat) => {
        const swapIndex = SWAPPING.indexOf(seat.id);
        return (
          <span className="hero-seat" data-slot={seat.id} key={seat.id}>
            {seat.glyphs.map((char, index) => {
              const arriving = index === 1;
              // Only a seat that actually has a replacement has anything to
              // hide. Every other seat's single glyph is the letter itself.
              const replaced = !arriving && seat.glyphs.length > 1;
              const cut = swapped ? undefined : cuts[swapIndex];
              // `motion.span` throughout so the two letters that move can carry a
              // motion value. The rest are given none, so Motion has nothing to
              // do on them.
              return (
                <motion.span
                  className="hero-glyph"
                  data-glyph={arriving ? "arriving" : "resting"}
                  key={char}
                  style={
                    swapped
                      ? arriving
                        ? // Stated rather than left off. Motion owns the inline
                          // clip while the seats are animating, and dropping the
                          // prop leaves its last value behind, so the settled
                          // state says what it means.
                          { clipPath: SHOWN }
                        : replaced
                          ? { visibility: "hidden" }
                          : undefined
                      : cut === undefined
                        ? undefined
                        : {
                            clipPath: arriving ? cut.arriving : cut.resting,
                          }
                  }
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
        );
      })}

      {/* The line, carried across the word by one translated element. It may not
          be wrapped in anything that isolates its blending, or it would vanish
          over a stroke. The carrier is left where the crossing ended rather than
          being parked back: the cuts are read from the same value, so resetting
          it would un-reveal the letters. */}
      <motion.span className="hero-sweep" style={{ x: sweepX }}>
        <span className="hero-line" data-beam-line />
      </motion.span>
    </span>
  );
}
