"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { AgentDeck } from "@/components/agents/agent-deck";
import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { SiteMark } from "@/components/hero/site-mark";
import { TrustWord } from "@/components/hero/trust-word";
import { Container } from "@/components/ui/section";
import { fillOffer, siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { SECTION } from "@/lib/site";
import type { Offer } from "@/lib/offer/format";

/**
 * The opening viewport: one diagonal, two halves.
 *
 * Above and to the left of the seam is the dark half. It carries the brand
 * sentence (TRUST THE PROCESS settling into TRUST THE PORCESS), the one line that
 * says what Porcess is, and the early-access form. Setting its own color tokens
 * means every control inside it inverts on its own: the text turns light, the
 * hairlines darken, and the primary button becomes a light button on dark.
 *
 * Below and to the right is the light half, where the agent cards rise from the
 * bottom edge and are cut off by it, so the deck is half present. They are the
 * product, and they are the reason to keep scrolling.
 *
 * The seam is drawn as its own line rather than as a border: a border on a
 * clip-path is clipped away with the shape, and one rule that reads on both
 * halves needs difference blending, not a fixed color.
 *
 * The hero is taller than the viewport so the deck fits in full: the opening
 * screen shows the top 40% of the cards, and scrolling reveals the rest. The
 * split layer is exactly one viewport tall, so the seam runs corner to corner
 * of the first screen instead of ending below the fold.
 *
 * The masthead is the old fixed nav, moved into the hero once the bar went
 * away: logo and brand on the left, offer and anchors on the right. It sits
 * across the diagonal, so it reads through difference blending for the same
 * reason as the seam rather than through a fixed color.
 */
export function ProductHero({ offer }: { offer: Offer }) {
  return (
    <section className="product-hero" data-hero-ready="true" id="product-hero">
      <div aria-hidden="true" className="hero-split">
        <div className="hero-split-dark" />
        {/* One rule, drawn twice and clipped to each half, so it reads on both:
            light over the dark triangle, dark over the light one. A single line
            with a fixed color would vanish on one half or the other. */}
        <svg
          className="hero-seam hero-seam-light"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line x1="0" x2="100" y1="100" y2="0" />
        </svg>
        <svg
          className="hero-seam hero-seam-dark"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line x1="0" x2="100" y1="100" y2="0" />
        </svg>
        {/* Narrow screens drop the diagonal for a flat, readable split: the same
            dark-over-light idea, without a wedge too thin to hold the copy. */}
        <div className="hero-seam-flat" />
      </div>

      <Container className="product-hero-inner">
        <div className="hero-masthead">
          <Link className="focus-ring hero-masthead-brand" href="/">
            <SiteMark className="hero-masthead-mark" />
            {siteCopy.brand.toUpperCase()}
          </Link>

          <nav aria-label={siteCopy.nav.label} className="hero-masthead-nav">
            <span aria-hidden="true" className="hero-masthead-offer">
              {fillOffer(siteCopy.offer.nav, offer.percent)}
            </span>

            <a
              className="focus-ring hero-masthead-link hero-masthead-link-wide"
              href={`#${SECTION.howItWorks}`}
              onClick={() => track("nav_why_clicked")}
            >
              {siteCopy.nav.howItWorks}
            </a>

            <a
              className="focus-ring hero-masthead-link"
              href={`#${SECTION.earlyAccess}`}
              onClick={() =>
                track("early_access_cta_clicked", { source: "hero" })
              }
            >
              {siteCopy.nav.cta}
            </a>
          </nav>
        </div>

        <div className="hero-dark-zone">
          <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
            {siteCopy.hero.eyebrow}
          </p>

          {/* The heading is the brand sentence once, for assistive technology and
              crawlers. The animated word is presentation of it, which is why the
              two are separate elements: a stack of glyphs that change places would
              otherwise be read out twice over. */}
          <h1 className="sr-only">{siteCopy.hero.headline}</h1>

          {/* Painted from the first frame rather than revealed: it is the reason
              the half is dark, and the line has to cross a word the visitor can
              already see. */}
          <div aria-hidden="true" className="hero-word-wrap">
            <TrustWord />
          </div>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="product-hero-lede"
            initial={false}
            transition={{ delay: 0.16, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {siteCopy.hero.hook}
          </motion.p>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="product-hero-form"
            initial={false}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <EarlyAccessForm offer={offer} placement="hero" showPromise />
          </motion.div>
        </div>
      </Container>

      <AgentDeck />
    </section>
  );
}
