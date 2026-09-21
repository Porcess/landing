"use client";

import Link from "next/link";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { Container } from "@/components/ui/section";
import { fillOffer, siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SECTION } from "@/lib/site";

/**
 * Two anchors plus the offer, one line, no menu.
 *
 * The offer appears in the bar only once the visitor has scrolled past the hero,
 * so the opening viewport stays quiet and the offer is still present on every
 * screen below it. Below `sm` it stays out of the way entirely: the hero note
 * and two sections already carry it, and crowding this bar is how a
 * clean nav starts looking like an ad.
 *
 * The scrolled state is driven by Motion's scroll value rather than a raw
 * `scroll` listener, and only the boolean crossing re-renders.
 */
export function SiteNav({ offerPercent }: { offerPercent: number }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => {
    const next = value > 16;
    setScrolled((current) => (current === next ? current : next));
  });

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200",
        scrolled
          ? "border-hairline bg-ground/80 backdrop-blur-md"
          : "nav-on-dark border-transparent",
      )}
    >
      <Container className="flex h-14 items-center justify-between gap-6 sm:h-16">
        <Link
          className="focus-ring font-display text-sm font-semibold tracking-eyebrow text-ink uppercase"
          href="/"
        >
          {siteCopy.brand.toUpperCase()}
        </Link>

        <div className="flex items-center gap-6">
          <span
            aria-hidden="true"
            className={cn(
              "hidden font-mono text-micro tracking-label text-ink-muted uppercase transition-opacity duration-300 sm:block",
              scrolled ? "opacity-100" : "opacity-0",
            )}
          >
            {fillOffer(siteCopy.offer.nav, offerPercent)}
          </span>

          <a
            className="focus-ring hidden font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink sm:block"
            href={`#${SECTION.howItWorks}`}
            onClick={() => track("nav_why_clicked")}
          >
            {siteCopy.nav.howItWorks}
          </a>

          <a
            className="focus-ring font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink"
            href={`#${SECTION.earlyAccess}`}
            onClick={() => track("early_access_cta_clicked", { source: "nav" })}
          >
            {siteCopy.nav.cta}
          </a>
        </div>
      </Container>
    </header>
  );
}
