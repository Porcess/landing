/**
 * The event vocabulary, shared by the page that emits events and the endpoint
 * that accepts them.
 *
 * One list, imported by both, because a vocabulary that exists in two places is
 * a vocabulary that drifts: a rename on the client would silently start
 * rejecting its own events at the server. Anything not named here is refused,
 * so a hostile caller cannot write arbitrary text into the table by inventing
 * event names.
 *
 * Isomorphic on purpose. Nothing in this module touches `window`, `node:crypto`
 * or a database, so it is safe to import from either side.
 */

export const ANALYTICS_EVENTS = [
  "page_view",
  "hero_animation_complete",
  "early_access_cta_clicked",
  "email_started",
  "email_submitted",
  "email_failed",
  /**
   * Reserved for the double opt-in step, which is deliberately out of scope for
   * the pre-launch page. Nothing emits this yet.
   */
  "email_verified",
  "problem_section_view",
  "workflow_section_view",
  "graph_section_view",
  "philosophy_section_view",
  "teaser_section_view",
  "early_access_section_view",
  "nav_why_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

const EVENT_SET: ReadonlySet<string> = new Set(ANALYTICS_EVENTS);

export function isAnalyticsEventName(
  value: unknown,
): value is AnalyticsEventName {
  return typeof value === "string" && EVENT_SET.has(value);
}

/**
 * The only property keys an event may carry.
 *
 * An allowlist rather than a size limit, because these values end up in a
 * `jsonb` column and are read back by the dashboard: unbounded keys are both a
 * storage problem and a way to put text on a page nobody audited.
 */
export const PROPERTY_KEYS = [
  "placement",
  "source",
  "reason",
  "duplicate",
  "reduced_motion",
] as const;

export type AnalyticsPropertyKey = (typeof PROPERTY_KEYS)[number];

export type AnalyticsProperties = Partial<
  Record<AnalyticsPropertyKey, string | number | boolean | null>
>;

const PROPERTY_KEY_SET: ReadonlySet<string> = new Set(PROPERTY_KEYS);
const MAX_PROPERTY_STRING = 128;

/**
 * Drops unknown keys, rejects nested values, and clamps strings.
 *
 * Returns a plain object safe to hand to `jsonb`, never throwing: a malformed
 * property must degrade to a missing one rather than lose the whole event,
 * since the event is the thing worth keeping.
 */
export function sanitizeProperties(input: unknown): AnalyticsProperties {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }

  const output: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(input)) {
    if (!PROPERTY_KEY_SET.has(key) || value === undefined) {
      continue;
    }

    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      // `NaN` and `Infinity` are not representable in JSON; drop them rather
      // than let a driver decide what to write.
      if (typeof value === "number" && !Number.isFinite(value)) {
        continue;
      }
      output[key as AnalyticsPropertyKey] = value;
      continue;
    }

    if (typeof value === "string") {
      output[key as AnalyticsPropertyKey] = value.slice(0, MAX_PROPERTY_STRING);
    }
  }

  return output;
}
