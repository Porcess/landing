"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { siteCopy } from "@/content/copy";
import { cn } from "@/lib/cn";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * An abstract view of work in progress.
 *
 * Deliberately not a product mock, and deliberately not words a real feature
 * would use: no queue depths, no run names, no repository anything. It is a list
 * of generic stages moving from queued to running to done, which is enough to
 * make the section feel like something is happening behind it without claiming
 * anything about what the product does.
 *
 * It loops while it is on screen, and stops being on screen when it is not,
 * which is also what pauses it.
 */

const STEP_MS = 2200;

export function ProcessMonitor() {
  const reduced = usePrefersReducedMotion();
  const rows = siteCopy.teaser.monitor;
  const [cursor, setCursor] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reduced || !visible) {
      return;
    }

    const timer = window.setInterval(() => {
      setCursor((current) => (current + 1) % rows.length);
    }, STEP_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [reduced, rows.length, visible]);

  return (
    <div
      aria-hidden="true"
      className="border border-hairline bg-ground"
      ref={ref}
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <span className="font-mono text-micro tracking-label text-ink-muted uppercase">
          In progress
        </span>
        <span className="font-mono text-micro tracking-label text-ink-muted uppercase">
          {String(cursor + 1).padStart(2, "0")} /{" "}
          {String(rows.length).padStart(2, "0")}
        </span>
      </div>

      <ul className="flex flex-col">
        {rows.map((row, index) => {
          // Reduced motion gets one honest snapshot rather than nothing: a
          // finished row, the row in hand, and the ones still waiting.
          const state = reduced
            ? index === 0
              ? "done"
              : index === 1
                ? "running"
                : "queued"
            : index === cursor
              ? "running"
              : index < cursor
                ? "done"
                : "queued";

          return (
            <li
              className={cn(
                "flex items-center gap-3 border-b border-hairline px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5",
                state === "queued" && "opacity-45",
              )}
              key={row}
            >
              {/* `min-w-0` so the row can shrink below its content's natural
                  width. Without it the longest stage name sets a floor that
                  overflows the gutter on a narrow screen. */}
              <span className="min-w-0 flex-1 truncate font-mono text-xs tracking-label text-ink uppercase">
                {row}
              </span>

              <span className="flex shrink-0 items-center gap-3">
                <span
                  className={cn(
                    "relative block h-px w-10 overflow-hidden sm:w-24",
                    state === "queued" ? "bg-hairline" : "bg-hairline-strong",
                  )}
                >
                  {state === "running" ? (
                    <motion.span
                      animate={{ scaleX: [0, 1] }}
                      className="absolute inset-0 block origin-left bg-ink"
                      initial={{ scaleX: 0 }}
                      key={cursor}
                      transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                  {state === "done" ? (
                    <span className="absolute inset-0 block bg-ink-muted" />
                  ) : null}
                </span>

                <span className="w-14 text-right font-mono text-micro tracking-label text-ink-muted uppercase sm:w-20">
                  {state === "running"
                    ? "Running"
                    : state === "done"
                      ? "Done"
                      : "Queued"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
