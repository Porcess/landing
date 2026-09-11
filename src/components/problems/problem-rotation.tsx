"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * Five statements, one at a time.
 *
 * This is not a carousel in the widget sense: no arrows, no dots, no cards, no
 * controls. One statement is present and the others are simply waiting just
 * above or below it, so the section reads as a page that keeps moving.
 *
 * It advances on its own every five seconds, and holds while the pointer is
 * over it so a statement cannot change out from under someone reading it.
 *
 * The crossfade is asymmetric on purpose. A symmetric one puts the outgoing and
 * incoming statements at half opacity at the same moment, which reads as two
 * overlapping headlines; here the one leaving clears out first and the one
 * arriving fades up behind its own travel.
 *
 * Reduced motion changes only the movement, never the structure. The section
 * still shows one statement at a time and still advances; the vertical travel
 * is dropped so the change is a plain fade. an earlier revision swapped in a
 * five item list under this preference, which silently replaced the whole
 * section with a wall of text and hid the design. A motion preference must not
 * rewrite the information architecture.
 */

const CADENCE_MS = 5000;
const OFFSET = 30;
const EASE = [0.4, 0, 0.2, 1] as const;

export function ProblemRotation() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
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
    if (held) {
      return;
    }

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
  }, [count, held]);

  return (
    <Section id="problems" labelledBy="problems-label">
      <Container>
        <h2
          className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase"
          id="problems-label"
        >
          {siteCopy.problems.label}
        </h2>

        {/* Every statement sits in one grid cell, so the section is always as
            tall as the longest of them and can never reflow mid rotation.
            `grid-cols-1` is load bearing: an implicit auto column would size
            itself to the widest statement and overflow the page gutter. */}
        <div
          className="mt-10 grid grid-cols-1 sm:mt-14"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
        >
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
                className={cn(
                  "col-start-1 row-start-1",
                  active ? undefined : "pointer-events-none",
                )}
                initial={false}
                key={item.id}
                transition={{
                  opacity: active
                    ? { duration: reduced ? 0.5 : 0.45, delay: reduced ? 0 : 0.3, ease: "easeOut" }
                    : { duration: 0.25, ease: "easeIn" },
                  y: { duration: reduced ? 0 : 0.7, ease: EASE },
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
      </Container>
    </Section>
  );
}
