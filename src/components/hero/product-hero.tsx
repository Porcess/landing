"use client";

import { motion } from "motion/react";

import { AgentDeck } from "@/components/agents/agent-deck";
import { EarlyAccessForm } from "@/components/early-access/early-access-form";
import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import type { Offer } from "@/lib/offer/format";

export function ProductHero({ offer }: { offer: Offer }) {
  return (
    <section className="product-hero" data-hero-ready="true" id="product-hero">
      <Container className="product-hero-inner">
        <div className="product-hero-copy">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase"
            initial={false}
          >
            {siteCopy.hero.eyebrow}
          </motion.p>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="product-hero-heading"
            initial={false}
            transition={{ delay: 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {siteCopy.hero.headline}
          </motion.h1>
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
        <AgentDeck />
      </Container>
    </section>
  );
}
