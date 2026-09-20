import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseConfigured = vi.fn();
const query = vi.fn();

vi.mock("@/lib/db", () => ({
  databaseConfigured: () => databaseConfigured() as boolean,
  query: (...args: unknown[]) => query(...args) as unknown,
}));

const { getActiveOffer, parseOfferInput, setActiveOffer } =
  await import("./settings");

describe("getActiveOffer", () => {
  beforeEach(() => {
    databaseConfigured.mockReset();
    query.mockReset();
  });

  it("falls back to the launch offer with no database", async () => {
    databaseConfigured.mockReturnValue(false);

    await expect(getActiveOffer()).resolves.toEqual({
      percent: 90,
      basePriceCents: 2000,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("reads the active row", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([{ percent: 75, basePriceCents: 2000 }]);

    await expect(getActiveOffer()).resolves.toEqual({
      percent: 75,
      basePriceCents: 2000,
    });
  });

  it("falls back when the row is missing", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([]);

    await expect(getActiveOffer()).resolves.toEqual({
      percent: 90,
      basePriceCents: 2000,
    });
  });

  it("falls back rather than throwing when the read fails", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockRejectedValue(new Error("connection refused"));

    await expect(getActiveOffer()).resolves.toEqual({
      percent: 90,
      basePriceCents: 2000,
    });
  });
});

describe("parseOfferInput", () => {
  it("accepts a digits-only percent and base price", () => {
    expect(parseOfferInput("75", "2000")).toEqual({
      ok: true,
      offer: { percent: 75, basePriceCents: 2000 },
    });
    expect(parseOfferInput("0", "100")).toEqual({
      ok: true,
      offer: { percent: 0, basePriceCents: 100 },
    });
  });

  it.each([
    ["a decimal", "9.5", "2000"],
    ["a negative percent", "-1", "2000"],
    ["a percent above 99", "100", "2000"],
    ["an empty percent", "", "2000"],
    ["a labelled percent", "90%", "2000"],
    ["a decimal price", "90", "20.00"],
    ["a zero price", "90", "0"],
    ["a price below the minimum", "90", "99"],
    ["a non-string percent", 90, "2000"],
    ["a non-string price", "90", 2000],
  ])("rejects %s", (_label, percent, basePriceCents) => {
    expect(parseOfferInput(percent, basePriceCents)).toEqual({ ok: false });
  });
});

describe("setActiveOffer", () => {
  beforeEach(() => {
    databaseConfigured.mockReset();
    query.mockReset();
  });

  it("reports an unconfigured database rather than pretending", async () => {
    databaseConfigured.mockReturnValue(false);

    await expect(
      setActiveOffer({ percent: 75, basePriceCents: 2000 }),
    ).resolves.toEqual({ ok: false, reason: "unconfigured" });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns the value it replaced", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([
      { previousPercent: 90, previousBasePriceCents: 2000 },
    ]);

    await expect(
      setActiveOffer({ percent: 75, basePriceCents: 2000 }),
    ).resolves.toEqual({
      ok: true,
      previous: { percent: 90, basePriceCents: 2000 },
      current: { percent: 75, basePriceCents: 2000 },
    });
  });

  it("reports no previous value for the first write", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([
      { previousPercent: null, previousBasePriceCents: null },
    ]);

    await expect(
      setActiveOffer({ percent: 90, basePriceCents: 2000 }),
    ).resolves.toEqual({
      ok: true,
      previous: null,
      current: { percent: 90, basePriceCents: 2000 },
    });
  });

  it("reports a failed write", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockRejectedValue(new Error("deadlock"));

    await expect(
      setActiveOffer({ percent: 75, basePriceCents: 2000 }),
    ).resolves.toEqual({ ok: false, reason: "failed" });
  });
});
