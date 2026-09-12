// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPayload, track } from "./analytics";

describe("buildPayload", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("carries the event, the attribution and the landing version", () => {
    const payload = buildPayload(
      "email_submitted",
      { placement: "hero" },
      {
        path: "/",
      },
    );

    expect(payload.event).toBe("email_submitted");
    expect(payload.properties).toEqual({ placement: "hero" });
    expect(payload.version).toBe("v1");
    expect(payload.path).toBe("/");
    expect(payload.attribution).toHaveProperty("utmSource");
  });

  it("drops a property key the collector would not accept", () => {
    const payload = buildPayload(
      "email_submitted",
      // A call site is allowed to hand over more than the vocabulary accepts;
      // the payload is what has to stay bounded.
      { placement: "hero", email: "builder@example.com" } as never,
      { path: "/" },
    );

    expect(payload.properties).toEqual({ placement: "hero" });
  });

  it("carries a visitor id that is stable across payloads", () => {
    const first = buildPayload("page_view", {}, { path: "/" });
    const second = buildPayload("page_view", {}, { path: "/" });

    expect(first.visitor).toBeTruthy();
    expect(first.visitor).toBe(second.visitor);
  });
});

describe("track", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/?utm_source=newsletter");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends to this site's own endpoint with no configuration at all", () => {
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("page_view");

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url] = beacon.mock.calls[0];
    expect(url).toBe("/analytics");
  });

  it("sends a beacon carrying the first-touch campaign", () => {
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("hero_animation_complete", { reduced_motion: false });

    const [, body] = beacon.mock.calls[0];
    expect(JSON.parse(body)).toMatchObject({
      event: "hero_animation_complete",
      properties: { reduced_motion: false },
      attribution: { utmSource: "newsletter" },
    });
  });

  it("honours an override endpoint when one is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "https://collector.example/");
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("page_view");

    const [url] = beacon.mock.calls[0];
    expect(url).toBe("https://collector.example/");
  });

  it("records nothing at all from the private area", () => {
    window.history.replaceState({}, "", "/a/n/stats");
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    // The dashboard must not be able to count the times it is being read.
    track("page_view");

    expect(beacon).not.toHaveBeenCalled();
  });

  it("ignores a name the vocabulary does not contain", () => {
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => true);
    vi.stubGlobal("navigator", { sendBeacon: beacon });

    track("invented_event" as never);

    expect(beacon).not.toHaveBeenCalled();
  });

  it("never throws when the collector is unreachable", () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("blocked");
      },
    });

    expect(() => track("page_view")).not.toThrow();
  });

  it("falls back to fetch when a beacon is refused", () => {
    const beacon = vi.fn<(url: string, body: string) => boolean>(() => false);
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("navigator", { sendBeacon: beacon });
    vi.stubGlobal("fetch", fetchMock);

    track("page_view");

    // `sendBeacon` returning false means the browser refused to queue it.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
