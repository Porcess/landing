"use client";

import type { ReactNode } from "react";

import {
  track,
  type AnalyticsEventName,
  type AnalyticsProperties,
} from "@/lib/analytics";

/**
 * A plain anchor that records its own click.
 *
 * Exists so a server-rendered link can be measured without turning its whole
 * section into a client component. The default action is never prevented: the
 * jump happens whether or not the event was recorded.
 */
export function TrackedAnchor({
  event,
  properties,
  className,
  href,
  children,
}: {
  event: AnalyticsEventName;
  properties?: AnalyticsProperties;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() => {
        track(event, properties ?? {});
      }}
    >
      {children}
    </a>
  );
}
