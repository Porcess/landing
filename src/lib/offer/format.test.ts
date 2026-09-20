import { describe, expect, it } from "vitest";

import {
  discountLabel,
  formatUsd,
  hasDiscount,
  offerPriceCents,
} from "./format";

describe("offerPriceCents", () => {
  it.each([
    [90, 2000, 200],
    [75, 2000, 500],
    [50, 2000, 1000],
    [0, 2000, 2000],
    [99, 2000, 20],
    [33, 2000, 1340],
    [90, 1000, 100],
  ])("prices %i%% off %i cents as %i cents", (percent, base, expected) => {
    expect(offerPriceCents({ percent, basePriceCents: base })).toBe(expected);
  });

  it("rounds to the nearest cent rather than truncating", () => {
    // 33.5% off $1.00 is 66.5 cents, which must round to 67, not 66.
    expect(offerPriceCents({ percent: 33.5, basePriceCents: 100 })).toBe(67);
  });
});

describe("formatUsd", () => {
  it.each([
    [200, "$2"],
    [2000, "$20"],
    [1000, "$10"],
    [1340, "$13.40"],
    [0, "$0"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatUsd(cents)).toBe(expected);
  });
});

describe("discountLabel", () => {
  it("states the discount as a percentage off", () => {
    expect(discountLabel(90)).toBe("90% off");
    expect(discountLabel(0)).toBe("0% off");
  });
});

describe("hasDiscount", () => {
  it("is false only at zero", () => {
    expect(hasDiscount({ percent: 90, basePriceCents: 2000 })).toBe(true);
    expect(hasDiscount({ percent: 0, basePriceCents: 2000 })).toBe(false);
  });
});
