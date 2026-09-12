import { describe, expect, it } from "vitest";

import {
  bucketLabel,
  buildFunnel,
  mergeSeries,
  parseRange,
  rangeLabel,
  rangeToSince,
  share,
} from "./queries";

const NOW = new Date("2026-09-12T10:00:00.000Z");

describe("parseRange", () => {
  it("accepts the four ranges", () => {
    expect(parseRange("24h")).toBe("24h");
    expect(parseRange("7d")).toBe("7d");
    expect(parseRange("30d")).toBe("30d");
    expect(parseRange("all")).toBe("all");
  });

  it("falls back to a week for anything else, including nothing", () => {
    for (const value of [undefined, "", "1y", "DROP TABLE", "7"]) {
      expect(parseRange(value)).toBe("7d");
    }
  });

  it("labels every range", () => {
    expect(rangeLabel("24h")).toBe("last 24 hours");
    expect(rangeLabel("all")).toBe("all time");
  });
});

describe("rangeToSince", () => {
  it("counts back the right number of hours", () => {
    expect(rangeToSince("24h", NOW)?.toISOString()).toBe(
      "2026-09-11T10:00:00.000Z",
    );
    expect(rangeToSince("7d", NOW)?.toISOString()).toBe(
      "2026-09-05T10:00:00.000Z",
    );
    expect(rangeToSince("30d", NOW)?.toISOString()).toBe(
      "2026-08-13T10:00:00.000Z",
    );
  });

  it("has no beginning for all time", () => {
    expect(rangeToSince("all", NOW)).toBeNull();
  });
});

describe("share", () => {
  it("reports a percentage to one decimal", () => {
    expect(share(1, 4)).toBe(25);
    expect(share(1, 3)).toBe(33.3);
  });

  it("never divides by zero", () => {
    expect(share(5, 0)).toBe(0);
    expect(share(0, 0)).toBe(0);
  });

  it("does not clamp a value above the total", () => {
    // Real data can do this: a visitor who reloads and submits twice, or a
    // signup whose click event was blocked. Hiding it would be a lie.
    expect(share(12, 10)).toBe(120);
  });
});

describe("buildFunnel", () => {
  it("computes each step against the one before it and against the first", () => {
    const steps = buildFunnel([
      { label: "views", count: 1000 },
      { label: "clicked", count: 250 },
      { label: "typed", count: 100 },
      { label: "submitted", count: 50 },
      { label: "joined", count: 40 },
    ]);

    expect(steps[0]).toMatchObject({ fromPrevious: null, fromFirst: null });
    expect(steps[1]).toMatchObject({ fromPrevious: 25, fromFirst: 25 });
    expect(steps[2]).toMatchObject({ fromPrevious: 40, fromFirst: 10 });
    expect(steps[4]).toMatchObject({ fromPrevious: 80, fromFirst: 4 });
  });

  it("survives a step with no predecessor to compare against", () => {
    const steps = buildFunnel([
      { label: "views", count: 0 },
      { label: "clicked", count: 0 },
    ]);

    expect(steps[1]?.fromPrevious).toBe(0);
    expect(steps[1]?.fromFirst).toBe(0);
  });

  it("handles an empty funnel", () => {
    expect(buildFunnel([])).toEqual([]);
  });
});

describe("mergeSeries", () => {
  it("fills the quiet days instead of drawing straight across them", () => {
    const day = 86_400;
    const points = mergeSeries(
      [
        { bucket: 100 * day, views: 10, visitors: 8 },
        { bucket: 103 * day, views: 4, visitors: 4 },
      ],
      [],
      "7d",
      new Date(103 * day * 1000),
    );

    expect(points.map((point) => point.views)).toEqual([10, 0, 0, 4]);
    expect(points.map((point) => point.views)[1]).toBe(0);
  });

  it("merges signups into the same buckets as the events", () => {
    const day = 86_400;
    const points = mergeSeries(
      [{ bucket: 100 * day, views: 10, visitors: 8 }],
      [{ bucket: 100 * day, count: 3 }],
      "7d",
      new Date(100 * day * 1000),
    );

    expect(points[0]).toMatchObject({ views: 10, signups: 3 });
  });

  it("keeps a signup that has no matching event", () => {
    const day = 86_400;
    const points = mergeSeries(
      [],
      [{ bucket: 100 * day, count: 2 }],
      "7d",
      new Date(100 * day * 1000),
    );

    expect(points[0]).toMatchObject({ views: 0, signups: 2 });
  });

  it("adds the current bucket, so today is always on the chart", () => {
    const day = 86_400;
    const startOfToday = Math.floor(NOW.getTime() / 1000 / day) * day;
    const points = mergeSeries(
      [{ bucket: startOfToday - 2 * day, views: 5, visitors: 5 }],
      [],
      "7d",
      NOW,
    );

    expect(points[points.length - 1]?.bucket).toBe(startOfToday);
    expect(points).toHaveLength(3);
  });

  it("uses hourly buckets for a single day", () => {
    const hour = 3600;
    const points = mergeSeries(
      [{ bucket: 100 * hour, views: 1, visitors: 1 }],
      [],
      "24h",
      new Date(102 * hour * 1000),
    );

    expect(points.map((point) => point.bucket)).toEqual([
      100 * hour,
      101 * hour,
      102 * hour,
    ]);
  });

  it("returns nothing when there is nothing at all", () => {
    expect(mergeSeries([], [], "7d", NOW)).toEqual([]);
  });
});

describe("bucketLabel", () => {
  it("shows a date for days and a time for hours, always in UTC", () => {
    const epoch = Math.floor(
      new Date("2026-09-11T23:30:00.000Z").getTime() / 1000,
    );

    expect(bucketLabel(epoch, "7d")).toBe("2026-09-11");
    expect(bucketLabel(epoch, "24h")).toBe("23:30");
  });
});
