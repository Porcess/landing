/**
 * The browser's side of analytics.
 *
 * One function, `track`, and a policy: it must never be able to break the page.
 * Every path out of here is guarded, and a failure to record something is never
 * surfaced to a visitor who has no way to act on it.
 *
 * Events go to this site's own `/analytics` by default, so the numbers live in
 * our database and no third party is involved. Setting
 * `NEXT_PUBLIC_ANALYTICS_ENDPOINT` points them somewhere else instead, which
 * exists for testing against a collector rather than for shipping a tracker.
 */

import {
  isAnalyticsEventName,
  sanitizeProperties,
  type AnalyticsEventName,
  type AnalyticsProperties,
} from "@/lib/analytics-events";
import { getAttribution } from "@/lib/attribution";
import { analyticsEndpoint, LANDING_VERSION, PRIVATE_PREFIX } from "@/lib/site";
import { getVisitorId } from "@/lib/visitor";

export type { AnalyticsEventName, AnalyticsProperties };

type Payload = {
  event: AnalyticsEventName;
  properties: AnalyticsProperties;
  attribution: ReturnType<typeof getAttribution>;
  visitor: string | null;
  path: string;
  version: string;
};

export function buildPayload(
  event: AnalyticsEventName,
  properties: AnalyticsProperties,
  context: { path: string },
): Payload {
  return {
    event,
    properties: sanitizeProperties(properties),
    attribution: getAttribution(),
    visitor: getVisitorId(),
    path: context.path,
    version: LANDING_VERSION,
  };
}

/**
 * Records one event. Safe to call from anywhere: without a browser, without an
 * endpoint, or with an unrecognised name it does nothing at all.
 */
export function track(
  event: AnalyticsEventName,
  properties: AnalyticsProperties = {},
): void {
  if (typeof window === "undefined") {
    return;
  }

  // Nothing under the private prefix is ever recorded. The dashboard must not
  // be able to count the times it is being read.
  if (window.location.pathname.startsWith(PRIVATE_PREFIX)) {
    return;
  }

  // Guarded here as well as on the server, so a typo in a call site fails
  // silently in the browser instead of making a round trip to be rejected.
  if (!isAnalyticsEventName(event)) {
    return;
  }

  const endpoint = analyticsEndpoint();

  let body: string;
  try {
    body = JSON.stringify(
      buildPayload(event, properties, { path: window.location.pathname }),
    );
  } catch {
    return;
  }

  try {
    if (typeof navigator.sendBeacon === "function") {
      // A beacon survives the page being closed, which matters for the events
      // that fire last: a submit, or the end of an animation.
      if (navigator.sendBeacon(endpoint, body)) {
        return;
      }
    }

    void fetch(endpoint, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  } catch {
    // Analytics must never surface an error to the visitor.
  }
}
