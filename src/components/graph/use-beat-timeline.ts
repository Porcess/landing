"use client";

import { useEffect, useRef, useState } from "react";

import type { AnalyticsEventName } from "@/lib/analytics";
import { track } from "@/lib/analytics";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/**
 * Drives a scripted sequence of beats.
 *
 * Returns how many beats have played, which consumers read as "how much of the
 * story is currently on screen". Three rules it enforces, because each one is
 * easy to get wrong per section:
 *
 * - Nothing runs until the section is actually visible, so a diagram is not
 *   finished before the visitor scrolls to it.
 * - Nothing runs under reduced motion. The caller gets the final beat straight
 *   away and renders the resolved state, with no traveling pulses.
 * - It stops at the last beat rather than looping, so the sequence keeps its
 *   meaning and the copy never re-animates under the reader's eye.
 */
export function useBeatTimeline(
  holds: number[],
  options: { event?: AnalyticsEventName; threshold?: number } = {},
): {
  ref: React.RefObject<HTMLDivElement | null>;
  active: number;
  running: boolean;
} {
  const { event, threshold = 0.25 } = options;
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [visible, setVisible] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (node === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const onScreen = entries[0]?.isIntersecting ?? false;
        setVisible(onScreen);

        if (onScreen && !viewedRef.current && event !== undefined) {
          viewedRef.current = true;
          track(event);
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [event, threshold]);

  const total = holds.length;

  useEffect(() => {
    if (reduced || !visible || beat >= total) {
      return;
    }

    const timer = window.setTimeout(
      () => setBeat((current) => current + 1),
      holds[beat] ?? 0,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [beat, holds, reduced, total, visible]);

  return {
    ref,
    active: reduced ? total : beat,
    running: !reduced && visible && beat < total,
  };
}
