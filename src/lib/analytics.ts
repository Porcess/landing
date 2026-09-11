/**
 * Analytics abstraction.
 *
 * No provider is wired in by default and no third-party script is loaded, so an
 * unconfigured deployment records nothing at all rather than shipping a tracker
 * nobody asked for. Setting `NEXT_PUBLIC_ANALYTICS_ENDPOINT` switches every
 * event on, sent as a beacon so nothing blocks the page.
 */

import { getAttribution } from "@/lib/attribution";
import { analyticsEndpoint, LANDING_VERSION } from "@/lib/site";

export type AnalyticsEventName =
  | "page_view"
  | "hero_animation_complete"
  | "early_access_cta_clicked"
  | "email_started"
  | "email_submitted"
  /**
   * Reserved for the double opt-in step, which is deliberately out of scope for
   * the pre-launch page. Nothing emits this yet.
   */
  | "email_verified"
  | "problem_section_view"
  | "workflow_section_view"
  | "graph_section_view"
  | "final_cta_view";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

type Payload = {
  event: AnalyticsEventName;
  properties: AnalyticsProperties;
  attribution: ReturnType<typeof getAttribution>;
  path: string;
  version: string;
  at: string;
};

export function buildPayload(
  event: AnalyticsEventName,
  properties: AnalyticsProperties,
  context: { path: string; at: string },
): Payload {
  return {
    event,
    properties,
    attribution: getAttribution(),
    path: context.path,
    version: LANDING_VERSION,
    at: context.at,
  };
}

/**
 * Records one event. Safe to call from anywhere: without a configured endpoint,
 * or without a browser, it does nothing at all.
 */
export function track(
  event: AnalyticsEventName,
  properties: AnalyticsProperties = {},
): void {
  if (typeof window === "undefined") {
    return;
  }

  const endpoint = analyticsEndpoint();
  if (endpoint === null) {
    return;
  }

  const body = JSON.stringify(
    buildPayload(event, properties, {
      path: window.location.pathname,
      at: new Date().toISOString(),
    }),
  );

  try {
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint, body);
      return;
    }

    void fetch(endpoint, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Analytics must never surface an error to the visitor.
  }
}
