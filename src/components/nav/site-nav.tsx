"use client";

import Link from "next/link";
import { useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";

import { Container } from "@/components/ui/section";
import { siteCopy } from "@/content/copy";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { SECTION } from "@/lib/site";

/**
 * Two items, one line, no menu.
 *
 * The scrolled state is driven by Motion's scroll value rather than a raw
 * `scroll` listener, and only the boolean crossing re-renders. The wordmark
 * stays a link to the top so the page never becomes a dead end.
 */
export function SiteNav() {
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
          : "border-transparent",
      )}
    >
      <Container className="flex h-14 items-center justify-between sm:h-16">
        <Link
          className="focus-ring font-display text-sm font-semibold tracking-eyebrow text-ink uppercase"
          href="/"
        >
          {siteCopy.brand.toUpperCase()}
        </Link>

        <a
          className="focus-ring font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink"
          href={`#${SECTION.earlyAccess}`}
          onClick={() => track("early_access_cta_clicked", { source: "nav" })}
        >
          {siteCopy.nav.cta}
        </a>
      </Container>
    </header>
  );
}
