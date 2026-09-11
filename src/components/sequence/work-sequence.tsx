"use client";

import { motion } from "motion/react";

import { Container, Section } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";

/**
 * The work around the work, as a vertical sequence of words.
 *
 * Each word rises with the rule above it drawing from left to right, so the
 * scroll reads as progress through a list rather than a set of features. These
 * are pieces of type, not cards: there is no border, no surface and no
 * explanation of what Porcess does about any of it.
 *
 * Reduced motion is handled in the stylesheet by `[data-reveal]`, so nothing
 * here needs to branch on the media query.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function WorkSequence() {
  return (
    <Section id="work" labelledBy="work-label">
      <Container>
        <h2
          className="max-w-statement font-display text-statement font-semibold text-balance text-ink"
          id="work-label"
        >
          {siteCopy.sequence.headline}
        </h2>

        <ol className="mt-14 sm:mt-20">
          {siteCopy.sequence.steps.map((step, index) => (
            <li key={step}>
              <motion.span
                aria-hidden="true"
                className="block h-px origin-left bg-hairline-strong"
                initial={{ scaleX: 0 }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.05,
                  ease: EASE,
                }}
                viewport={{ once: true, amount: 0.6 }}
                whileInView={{ scaleX: 1 }}
              />
              <motion.span
                className="block py-3 font-display text-sequence font-semibold text-ink sm:py-4"
                data-reveal
                initial={{ opacity: 0, y: 26 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.05,
                  ease: EASE,
                }}
                viewport={{ once: true, amount: 0.6 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                {step}
              </motion.span>
            </li>
          ))}
        </ol>

        <motion.div
          className="mt-14 border-t border-ink pt-6 sm:mt-20 sm:pt-8"
          data-reveal
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.7, ease: EASE }}
          viewport={{ once: true, amount: 0.5 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <p className="font-display text-sequence font-semibold text-ink">
            {siteCopy.sequence.terminus}
          </p>
          <p className="mt-4 max-w-prose text-lead text-ink-muted">
            {siteCopy.sequence.terminusBody}
          </p>
        </motion.div>
      </Container>
    </Section>
  );
}
