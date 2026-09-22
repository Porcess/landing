"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { AgentDeck } from "@/components/agents/agent-deck";
import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { SiteMark } from "@/components/hero/site-mark";
import { Container } from "@/components/ui/section";
import { fillOffer, siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { SECTION } from "@/lib/site";
import type { Offer } from "@/lib/offer/format";

/**
 * The opening viewport: one light surface.
 *
 * It carries the brand sentence (TRUST THE PROCESS settling into TRUST THE
 * PORCESS), the one line that says what Porcess is, and the early-access form,
 * all in the page's own palette: dark ink on the light ground, with the ordinary
 * dark button. There is no dark half and no seam.
 *
 * Below the copy the agent cards rise from the bottom edge and are cut off by it,
 * so the deck is half present. They are the product, and they are the reason to
 * keep scrolling.
 *
 * The hero is taller than the viewport so the deck fits in full: the opening
 * screen shows the top two-thirds of the cards, and scrolling reveals the rest.
 * The split layer is exactly one viewport tall; it draws nothing now, but it
 * still marks the first screen everything is laid out against.
 *
 * The masthead is the old fixed nav, moved into the hero once the bar went away:
 * logo and brand on the left, offer and anchors on the right, spanning the full
 * screen width rather than the page measure.
 */
export function ProductHero({ offer }: { offer: Offer }) {
  return (
    <section className="product-hero" data-hero-ready="true" id="product-hero">
      {/* An empty layer a viewport tall: the hero is one light surface, so there
          is no dark half or seam left to draw, but the box still marks the first
          screen that the copy and cards are laid out against. */}
      <div aria-hidden="true" className="hero-split" />

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
          {/* One heading, two visual lines: a name line and a larger-range
              qualifier under it. The label states both as one sentence so the
              heading reads the same to assistive technology however it wraps. */}
          <h1
            aria-label={`${siteCopy.hero.headline} ${siteCopy.hero.headlineTail}`}
            className="product-hero-headline"
          >
            <span className="product-hero-headline-main">
              {siteCopy.hero.headline}
            </span>
            <span className="product-hero-headline-sub">
              {siteCopy.hero.headlineTail}
            </span>
          </h1>

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
