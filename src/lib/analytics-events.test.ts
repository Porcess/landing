import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENTS,
  isAnalyticsEventName,
  sanitizeProperties,
} from "./analytics-events";

describe("the event vocabulary", () => {
  it("has no duplicates, so nothing is silently shadowed", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });

  it("recognises its own names and refuses everything else", () => {
    for (const name of ANALYTICS_EVENTS) {
      expect(isAnalyticsEventName(name)).toBe(true);
    }

    for (const value of [
      "",
      "PAGE_VIEW",
      "page view",
      null,
      undefined,
      1,
      {},
    ]) {
      expect(isAnalyticsEventName(value)).toBe(false);
    }
  });
});

describe("sanitizeProperties", () => {
  it("keeps the allowed keys", () => {
    expect(
      sanitizeProperties({ placement: "hero", source: "nav", duplicate: true }),
    ).toEqual({ placement: "hero", source: "nav", duplicate: true });
  });

  it("drops anything not on the allowlist", () => {
    // An address slipped into a property is exactly what must not reach a row.
    expect(
      sanitizeProperties({ placement: "hero", email: "builder@example.com" }),
    ).toEqual({ placement: "hero" });
  });

  it("drops nested values rather than serialising them", () => {
    expect(sanitizeProperties({ placement: { deep: "object" } })).toEqual({});
    expect(sanitizeProperties({ placement: ["a", "b"] })).toEqual({});
  });

  it("clamps long strings", () => {
    const long = "x".repeat(500);
    const result = sanitizeProperties({ reason: long });

    expect(result.reason).toHaveLength(128);
  });

  it("drops numbers that JSON cannot represent", () => {
    expect(sanitizeProperties({ reason: Number.NaN })).toEqual({});
    expect(sanitizeProperties({ reason: Number.POSITIVE_INFINITY })).toEqual(
      {},
    );
  });

  it("returns an empty object for anything that is not an object", () => {
    for (const value of [null, undefined, "text", 7, ["a"]]) {
      expect(sanitizeProperties(value)).toEqual({});
    }
  });
});
