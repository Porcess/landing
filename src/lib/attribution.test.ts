import { describe, expect, it } from "vitest";

import { hasAttribution, readAttribution } from "./attribution";

describe("readAttribution", () => {
  it("reads every campaign parameter", () => {
    const attribution = readAttribution(
      "?utm_source=hn&utm_medium=social&utm_campaign=launch&utm_content=a&utm_term=agents",
      "https://news.ycombinator.com/",
    );

    expect(attribution).toEqual({
      referrer: "https://news.ycombinator.com/",
      utmSource: "hn",
      utmMedium: "social",
      utmCampaign: "launch",
      utmContent: "a",
      utmTerm: "agents",
    });
  });

  it("returns nulls when nothing was supplied", () => {
    expect(readAttribution("", "")).toEqual({
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
    });
  });

  it("treats blank values as absent and bounds what it keeps", () => {
    const attribution = readAttribution(
      `?utm_source=%20%20&utm_campaign=${"c".repeat(600)}`,
      "",
    );

    expect(attribution.utmSource).toBeNull();
    expect(attribution.utmCampaign).toHaveLength(512);
  });
});

describe("hasAttribution", () => {
  it("is false for an empty record and true for any signal", () => {
    expect(
      hasAttribution({
        referrer: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        utmTerm: null,
      }),
    ).toBe(false);

    expect(
      hasAttribution({
        referrer: "https://example.com",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        utmTerm: null,
      }),
    ).toBe(true);
  });
});
