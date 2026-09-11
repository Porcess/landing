"use client";

import { useEffect } from "react";

import type { AnalyticsEventName } from "@/lib/analytics";
import { track } from "@/lib/analytics";

/**
 * Records a single view event for an element already on the page.
 *
 * Renders nothing and adds no wrapper element, so it can never affect layout.
 * It observes by id, fires once at half visibility, and disconnects.
 */
export function ViewEvent({
  event,
  target,
  threshold = 0.5,
}: {
  event: AnalyticsEventName;
  target: string;
  threshold?: number;
}) {
  useEffect(() => {
    const node = document.getElementById(target);
    if (node === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting === true) {
          track(event);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [event, target, threshold]);

  return null;
}
