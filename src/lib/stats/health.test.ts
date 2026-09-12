import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `health` is the one query the dashboard must never let crash the page, so its
 * three states are pinned here: no database, a database that will not answer,
 * and a working one. Only the last needs a real database, which the e2e suite
 * has.
 */

const databaseConfigured = vi.fn<() => boolean>();
const targetDatabase = vi.fn<() => string>();
const query = vi.fn<() => Promise<unknown[]>>();

vi.mock("@/lib/db", () => ({
  databaseConfigured: () => databaseConfigured(),
  targetDatabase: () => targetDatabase(),
  query: () => query(),
}));

const { health } = await import("./queries");

describe("health", () => {
  beforeEach(() => {
    databaseConfigured.mockReset();
    targetDatabase.mockReset();
    query.mockReset();
    targetDatabase.mockReturnValue("porcess_landing");
  });

  it("reports an unconfigured database as unconfigured, not as broken", async () => {
    databaseConfigured.mockReturnValue(false);

    const status = await health();

    expect(status.configured).toBe(false);
    expect(status.reachable).toBe(false);
    expect(status.problem).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("reports a configured database that throws as configured but unreachable", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockRejectedValue(
      new Error('relation "analytics_events" does not exist'),
    );

    const status = await health();

    // The distinction is the whole point: the fix for this is a migration, not
    // an environment variable, so it must not read as "not configured".
    expect(status.configured).toBe(true);
    expect(status.reachable).toBe(false);
    expect(status.problem).toContain("analytics_events");
    expect(status.database).toBe("porcess_landing");
  });

  it("survives a thrown value that is not an Error", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockRejectedValue("plain string");

    const status = await health();

    expect(status.reachable).toBe(false);
    expect(status.problem).toBe("unknown error");
  });

  it("reports a working database and reads the three facts", async () => {
    const lastEventAt = new Date("2026-09-12T10:00:00.000Z");
    const lastSignupAt = new Date("2026-09-12T09:00:00.000Z");
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([{ lastEventAt, lastSignupAt, eventsLast24h: 42 }]);

    const status = await health();

    expect(status.configured).toBe(true);
    expect(status.reachable).toBe(true);
    expect(status.problem).toBeNull();
    expect(status.lastEventAt).toBe(lastEventAt);
    expect(status.lastSignupAt).toBe(lastSignupAt);
    expect(status.eventsLast24h).toBe(42);
  });

  it("reports an empty result as nothing recorded, not as a failure", async () => {
    databaseConfigured.mockReturnValue(true);
    query.mockResolvedValue([]);

    const status = await health();

    expect(status.reachable).toBe(true);
    expect(status.lastEventAt).toBeNull();
    expect(status.lastSignupAt).toBeNull();
    expect(status.eventsLast24h).toBe(0);
  });
});
