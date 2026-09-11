import { describe, expect, it } from "vitest";

import { siteCopy } from "./copy";

/** Every string in the copy tree, with the path that reached it. */
function collectStrings(
  value: unknown,
  path = "siteCopy",
): { path: string; text: string }[] {
  if (typeof value === "string") {
    return [{ path, text: value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectStrings(entry, `${path}[${index}]`),
    );
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectStrings(entry, `${path}.${key}`),
    );
  }

  return [];
}

const strings = collectStrings(siteCopy);

describe("copy rules", () => {
  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it("never uses an em-dash or an en-dash", () => {
    const offenders = strings.filter((entry) =>
      /[\u2014\u2013]/.test(entry.text),
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("rations middots to at most one per string", () => {
    const offenders = strings.filter(
      (entry) => (entry.text.match(/\u00b7/g) ?? []).length > 1,
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });
});

describe("the offer stays truthful", () => {
  /** Any string that promises a percentage. */
  const discountStrings = strings.filter((entry) => entry.text.includes("90%"));

  it("has discount copy to check", () => {
    expect(discountStrings.length).toBeGreaterThan(3);
  });

  it("always scopes the discount to three months", () => {
    // Case-insensitive: the marquee strip is uppercase, and "3 months" there is
    // still the same scope.
    const unscoped = discountStrings.filter(
      (entry) => !/3 months/i.test(entry.text),
    );
    // An unqualified "90% off" is the ambiguous promise worth avoiding.
    expect(unscoped.map((entry) => entry.path)).toEqual([]);
  });

  it("states the giveaway duration wherever it is offered", () => {
    // Whole word only: a bare /win/ also matches "growing", which is not a
    // giveaway and should not be held to these terms.
    const giveawayStrings = strings.filter((entry) =>
      /\bwin(s|ner)?\b/i.test(entry.text),
    );
    expect(giveawayStrings.length).toBeGreaterThan(1);

    for (const entry of giveawayStrings) {
      const scoped = /3 months/i.test(entry.text);
      const isLabel =
        entry.path.endsWith("giveaway") || entry.path.endsWith("short");
      // Labels are allowed to be short; anything that reads as a full promise
      // must carry the duration and the no-purchase condition.
      if (!isLabel) {
        expect(scoped, `${entry.path} should state the duration`).toBe(true);
      }
    }
  });

  it("says no purchase is needed in the full giveaway terms", () => {
    expect(siteCopy.offer.giveawayLong).toContain("No purchase needed");
  });
});

describe("the product stays unrevealed", () => {
  it("never names internal machinery in visible copy", () => {
    // Words that describe how the product works rather than the problem. None
    // of these belong on a teaser.
    const forbidden = [
      "agent",
      "AI",
      "LLM",
      "model",
      "autonomous",
      "runtime",
      "workflow engine",
      "pipeline",
    ];

    for (const entry of strings) {
      for (const term of forbidden) {
        const pattern = new RegExp(`\\b${term}\\b`, "i");
        expect(
          pattern.test(entry.text),
          `${entry.path} should not use "${term}"`,
        ).toBe(false);
      }
    }
  });
});
