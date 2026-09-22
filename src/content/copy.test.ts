import { describe, expect, it } from "vitest";

import { fillOffer, siteCopy } from "./copy";

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

/**
 * The offer strings, with the placeholder filled, so the rules below are checked
 * against the text a visitor actually reads rather than against a template.
 */
const offerStrings = [
  { path: "offer.nav", text: fillOffer(siteCopy.offer.nav, 90) },
  { path: "offer.heroNote", text: fillOffer(siteCopy.offer.heroNote, 90) },
  { path: "offer.onList", text: fillOffer(siteCopy.offer.onList, 90) },
  {
    path: "earlyAccess.body",
    text: fillOffer(siteCopy.earlyAccess.body, 90),
  },
  ...siteCopy.earlyAccess.benefits.flatMap((benefit, index) => [
    {
      path: `earlyAccess.benefits[${index}].title`,
      text: fillOffer(benefit.title, 90),
    },
    {
      path: `earlyAccess.benefits[${index}].body`,
      text: fillOffer(benefit.body, 90),
    },
  ]),
];

describe("copy rules", () => {
  it("has strings to check", () => {
    expect(strings.length).toBeGreaterThan(50);
    expect(offerStrings.length).toBeGreaterThan(5);
  });

  it("never uses an em-dash or an en-dash", () => {
    const offenders = [...strings, ...offerStrings].filter((entry) =>
      /[\u2014\u2013]/.test(entry.text),
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("rations middots to at most one per string", () => {
    const offenders = [...strings, ...offerStrings].filter(
      (entry) => (entry.text.match(/\u00b7/g) ?? []).length > 1,
    );
    expect(offenders.map((entry) => entry.path)).toEqual([]);
  });

  it("uses the percent placeholder only where a discount belongs", () => {
    for (const entry of strings) {
      if (entry.text.includes("{percent}")) {
        expect(fillOffer(entry.text, 90)).toContain("90%");
      }
    }
  });
});

describe("the offer stays a bare discount", () => {
  it("states the discount as a plain percentage", () => {
    const withDiscount = offerStrings.filter((entry) =>
      entry.text.includes("90%"),
    );
    expect(withDiscount.length).toBeGreaterThan(3);
  });

  it("adds no duration, scope, or companion promise", () => {
    // Sentences may embed the offer ("Early birds get 90% off."), but no string
    // may qualify it with a duration, a companion promise, or a plus.
    const qualified = offerStrings.filter((entry) =>
      /3 months|\bwin(s|ner)?\b|chance|free|\+/i.test(entry.text),
    );
    expect(qualified.map((entry) => `${entry.path}: ${entry.text}`)).toEqual(
      [],
    );
  });

  it("offers no giveaway and no duration qualifier anywhere", () => {
    const offenders = [...strings, ...offerStrings].filter((entry) =>
      /\bwin(s|ner)?\b|\bdraw\b|giveaway|no purchase|3 months/i.test(
        entry.text,
      ),
    );
    expect(offenders.map((entry) => `${entry.path}: ${entry.text}`)).toEqual(
      [],
    );
  });

  it("fills any percent without leaving the placeholder behind", () => {
    for (const percent of [90, 75, 50, 0]) {
      for (const entry of offerStrings) {
        const template = entry.text.replaceAll("90", "{percent}");
        expect(fillOffer(template, percent)).not.toContain("{percent}");
      }
    }
  });
});

describe("the product copy stays grounded", () => {
  it("names the current agent workflows", () => {
    expect(siteCopy.agents.map((agent) => agent.id)).toEqual([
      "clips",
      "shorts",
      "marketing",
      "seo",
      "testing",
    ]);
    expect(siteCopy.howItWorks.steps).toHaveLength(4);
  });
});
