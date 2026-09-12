"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { EASE_CROSSFADE } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * Five statements, one at a time.
 *
 * Not a carousel in the widget sense: no arrows, no dots, no controls. One
 * statement is present and the others wait just above or below, so the section
 * reads as a page that keeps moving.
 *
 * Two details carry the "this thing is processing" idea:
 *
 * - a numbered index against the eyebrow, so the visitor always knows there is
 *   more coming and how far in they are
 * - a rule that fills across the cadence, so the next change is never a surprise
 *
 * It pauses only for reasons the visitor cannot ignore: the section is off
 * screen, or the tab is in the background. It deliberately does NOT pause on
 * hover. An earlier revision did, and it read as broken: a reader's cursor rests
 * mid-viewport while they scroll, so the pointer sits over a section this tall
 * almost by accident, and the rotation froze for as long as they left it there.
 * Nothing in this section is interactive, so hover has no meaning to honour.
 *
 * Reduced motion changes only the travel: the offsets are dropped so the change
 * is a plain fade. The section still shows one statement at a time and still
 * advances. An earlier revision swapped in a five item list under this
 * preference, which silently replaced the section with a wall of text and hid
 * the design. A motion preference must not rewrite the information architecture.
 */

/**
 * Faster than the first pass at this. At five seconds the change arrived after
 * most readers had finished the statement and moved on, so the section read as
 * static rather than as something working.
 */
const CADENCE_MS = 3000;
/**
 * Short, quiet travel. Both statements ride the same curve and duration, so the
 * change reads as one continuous scroll rather than two separate animations.
 */
const OFFSET = 20;
const EASE = EASE_CROSSFADE;

export function ProblemRotation() {
  const reduced = usePrefersReducedMotion();

  const [index, setIndex] = useState(0);
  const items = siteCopy.problems.items;
  const count = items.length;

  useEffect(() => {
    const node = document.getElementById("problems");
    if (node === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting === true) {
          track("problem_section_view");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const node = document.getElementById("problems");
    let onScreen = node === null;

    const observer =
      node === null
        ? null
        : new IntersectionObserver(
            (entries) => {
              onScreen = entries[0]?.isIntersecting ?? false;
            },
            { threshold: 0.25 },
          );

    if (node !== null && observer !== null) {
      observer.observe(node);
    }

    const timer = window.setInterval(() => {
      if (onScreen && document.visibilityState === "visible") {
        setIndex((current) => (current + 1) % count);
      }
    }, CADENCE_MS);

    return () => {
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [count]);

  return (
    <Section id="problems" labelledBy="problems-label">
      <Container>
        <div className="flex items-baseline justify-between gap-6 border-b border-hairline pb-5">
          <h2
            className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase"
            id="problems-label"
          >
            {siteCopy.problems.label}
          </h2>
          <p className="font-mono text-xs tracking-label text-ink-muted tabular-nums">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(count).padStart(2, "0")}
          </p>
        </div>

        {/* Every statement sits in one grid cell, so the section is always as
            tall as the longest of them and can never reflow mid rotation.
            `grid-cols-1` is load bearing: an implicit auto column would size
            itself to the widest statement and overflow the page gutter. */}
        <div className="mt-10 grid grid-cols-1 sm:mt-14">
          {items.map((item, itemIndex) => {
            const distance = (index - itemIndex + count) % count;
            const active = distance === 0;
            const leaving = distance === 1;

            return (
              <motion.div
                animate={{
                  opacity: active ? 1 : 0,
                  y: active ? 0 : reduced ? 0 : leaving ? -OFFSET : OFFSET,
                }}
                aria-hidden={active ? undefined : true}
                className={cn(
                  "col-start-1 row-start-1",
                  active ? undefined : "pointer-events-none",
                )}
                inert={!active}
                initial={false}
                key={item.id}
                transition={{
                  // Asymmetric on purpose. A symmetric crossfade puts the
                  // outgoing and incoming statements at half opacity at the same
                  // moment, which reads as two overlapping headlines. The old
                  // statement leaves over 0.3s and the new one follows almost
                  // at once, so there is neither a snap nor a blank hole: the
                  // pair hands over like a filmstrip. Timed to finish well
                  // inside the shorter cadence: a transition that runs most of
                  // the cycle never looks settled.
                  opacity: active
                    ? {
                        duration: 0.45,
                        delay: reduced ? 0 : 0.16,
                        ease: "easeOut",
                      }
                    : { duration: 0.3, ease: "easeIn" },
                  y: { duration: reduced ? 0 : 0.6, ease: EASE },
                }}
              >
                <h3 className="max-w-statement font-display text-statement font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-measure text-lead text-ink-muted">
                  {item.body}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* The cadence rule. Restarts on every change, which is what makes the
            next statement feel announced rather than sudden. The rule is
            `min-w-0 flex-1` rather than a fixed max width: a fixed one plus the
            label overflowed the gutter at 320px. */}
        <div className="mt-10 flex items-center gap-5 sm:mt-14">
          <span className="relative block h-px min-w-0 flex-1 overflow-hidden bg-hairline">
            <motion.span
              animate={{ scaleX: 1 }}
              className="absolute inset-0 block origin-left bg-ink"
              initial={{ scaleX: 0 }}
              key={index}
              transition={{ duration: CADENCE_MS / 1000, ease: "linear" }}
            />
          </span>
          <span className="shrink-0 font-mono text-micro tracking-label text-ink-muted uppercase">
            {siteCopy.problems.status}
          </span>
        </div>
      </Container>
    </Section>
  );
}
