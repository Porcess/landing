// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPayload, track } from "./analytics";

describe("buildPayload", () => {
  it("carries the event, the attribution and the landing version", () => {
    const payload = buildPayload(
      "email_submitted",
      { placement: "hero" },
      { path: "/", at: "2026-09-11T00:00:00.000Z" },
    );

    expect(payload.event).toBe("email_submitted");
    expect(payload.properties).toEqual({ placement: "hero" });
    expect(payload.version).toBe("v1");
    expect(payload.path).toBe("/");
    expect(payload.attribution).toHaveProperty("utmSource");
  });
});

describe("track", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/?utm_source=newsletter");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing at all when no collector is configured", () => {
    const beacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("page_view");

    expect(beacon).not.toHaveBeenCalled();
  });

  it("sends a beacon carrying the first-touch campaign when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "https://collector.example/");
    const beacon = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("hero_animation_complete", { reduced_motion: false });

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0] as [string, string];
    expect(url).toBe("https://collector.example/");
    expect(JSON.parse(body)).toMatchObject({
      event: "hero_animation_complete",
      properties: { reduced_motion: false },
      attribution: { utmSource: "newsletter" },
    });
  });

  it("never throws when the collector is unreachable", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "https://collector.example/");
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("blocked");
      },
    });

    expect(() => track("page_view")).not.toThrow();
  });
});
