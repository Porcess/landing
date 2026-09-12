"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { siteCopy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { EASE_SETTLE } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * The roles, as a vertical reel that never stops.
 *
 * A reel, not a crossfade. The whole track travels, so the words read as one
 * column passing the reader rather than a slide being swapped out. That motion
 * is the section's argument, which is why it gets the larger half of the layout
 * and the largest type on the page after the hero.
 *
 * WHY THE LOOP IS INVISIBLE
 *
 * The track holds three identical copies of the list and the window shows five
 * slots, so there is always another copy arriving from below. Once the reel has
 * walked one full copy it snaps back by exactly one copy. That snap is
 * invisible because the window it lands on is word for word and tone for tone
 * identical to the one it left: the same five roles, at the same five slots, in
 * the same five tones. Nothing is hidden and the scroll never runs backwards.
 *
 * Every position is a percentage of the track, so the whole thing is driven by
 * two CSS variables and needs no measurement at any width.
 */

/** Three copies is the smallest number that leaves room for a silent snap. */
const COPIES = 3;
/** Rows on screen at once. Mirrored into CSS through `--reel-visible`. */
const VISIBLE = 5;
/**
 * Which of those rows holds the lit word. The second, so each role rises into
 * the light and out again rather than appearing already at the top.
 */
const FOCUS_SLOT = 1;
/** Time between two active states. */
const CADENCE_MS = 1750;
/** How long one row of travel takes. */
const TRAVEL_SECONDS = 0.8;

/**
 * Tone by distance from the lit word. The lit word is full ink and the rest
 * fall away quickly, so the eye never has to decide which one is speaking.
 */
const TONE = [1, 0.38, 0.2, 0.1, 0.06];

export function RoleReel() {
  const reduced = usePrefersReducedMotion();
  const roles = siteCopy.teaser.roles;
  const count = roles.length;
  const trackLength = count * COPIES;

  // Annotated, not inferred: the roles array is `as const`, so an unannotated
  // state would be narrowed to the literal length and reject every later step.
  const [beat, setBeat] = useState<{ step: number; snap: boolean }>({
    step: count,
    snap: false,
  });
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (node === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries[0]?.isIntersecting ?? false),
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reduced || !onScreen || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      setBeat((current) => {
        const next = current.step + 1;
        // A full copy has been walked. Step back one copy, in place.
        if (next >= count * (COPIES - 1)) {
          return { step: next - count, snap: true };
        }
        return { step: next, snap: false };
      });
    }, CADENCE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [count, onScreen, paused, reduced]);

  // Reduced motion: every role, set at the same scale, with no travel and no
  // dimming. Nothing is hidden behind an animation that will not run.
  if (reduced) {
    return (
      <ul className="role-reel-static" data-role-reel="static">
        {roles.map((role) => (
          <li className="role-reel-word" key={role}>
            {role}
          </li>
        ))}
      </ul>
    );
  }

  const offset = -((beat.step - FOCUS_SLOT) * (100 / trackLength));

  return (
    <>
      <div
        aria-hidden="true"
        className="role-reel"
        data-role-reel="live"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        ref={viewportRef}
        style={{ "--reel-visible": VISIBLE } as CSSProperties}
      >
        <motion.div
          animate={{ y: `${offset.toFixed(4)}%` }}
          className="role-reel-track"
          data-role-reel-track
          initial={false}
          transition={{
            // The snap is a jump cut by design. It lands on an identical window,
            // so animating it would be the only thing that could give it away.
            duration: beat.snap ? 0 : TRAVEL_SECONDS,
            ease: EASE_SETTLE,
          }}
        >
          {Array.from({ length: trackLength }, (_, index) => {
            const distance = index - beat.step;
            const slot = distance + FOCUS_SLOT;
            const inWindow = slot >= 0 && slot < VISIBLE;
            const lit = distance === 0;

            return (
              <div className="role-reel-slot" key={index}>
                <span
                  className={cn("role-reel-word", lit && "role-reel-word-lit")}
                  data-reel-lit={lit ? "true" : undefined}
                  style={{
                    opacity: inWindow ? (TONE[Math.abs(distance)] ?? 0) : 0,
                  }}
                >
                  {roles[index % count]}
                </span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* The reel duplicates the list three times over, which is right for the
          eye and wrong for a screen reader. The roles are read out once here
          instead of eighteen times from the track. */}
      <ul className="sr-only">
        {roles.map((role) => (
          <li key={role}>{role}</li>
        ))}
      </ul>
    </>
  );
}
