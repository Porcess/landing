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

describe("the offer stays a bare discount", () => {
  /** Any string that promises a percentage. */
  const discountStrings = strings.filter((entry) => entry.text.includes("90%"));

  it("has discount copy to check", () => {
    expect(discountStrings.length).toBeGreaterThan(3);
  });

  it("states a bare 90% off with no scope or companion promise", () => {
    // Sentences may embed the offer ("Early birds get 90% off."), but no
    // string may qualify it with a duration, a companion promise, or a plus.
    const qualified = discountStrings.filter((entry) =>
      /3 months|\bwin(s|ner)?\b|chance|free|\+/i.test(entry.text),
    );
    expect(qualified.map((entry) => `${entry.path}: ${entry.text}`)).toEqual(
      [],
    );
  });

  it("offers no giveaway and no duration qualifier anywhere", () => {
    const offenders = strings.filter((entry) =>
      /\bwin(s|ner)?\b|\bdraw\b|giveaway|no purchase|3 months/i.test(
        entry.text,
      ),
    );
    expect(offenders.map((entry) => `${entry.path}: ${entry.text}`)).toEqual(
      [],
    );
  });
});

describe("the product copy stays grounded", () => {
  it("names the current agent workflows", () => {
    expect(siteCopy.agents.map((agent) => agent.id)).toEqual([
      "clips",
      "shorts",
      "marketing",
      "seo",
    ]);
    expect(siteCopy.howItWorks.steps).toHaveLength(4);
  });
});
