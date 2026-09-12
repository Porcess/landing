/**
 * The one PostgreSQL pool this process owns.
 *
 * Shared by the signup store and the stats queries so the dashboard cannot
 * quietly open a second pool beside the first. Using `pg` rather than the Neon
 * HTTP driver keeps the same code path runnable against a local Postgres and a
 * hosted one, which is what makes the write path testable at all.
 *
 * The pool is deliberately small. A hosted Postgres reached through a pooled
 * endpoint already multiplexes server connections, and a serverless host scales
 * by instance, so a large per-instance pool multiplies connections rather than
 * throughput.
 */

import { Pool, type QueryResultRow } from "pg";

const globalForPool = globalThis as unknown as {
  porcessPool?: { pool: Pool; connectionString: string };
};

/** The configured connection string, or null when there is not one. */
export function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL;
  return value !== undefined && value.length > 0 ? value : null;
}

export function databaseConfigured(): boolean {
  return databaseUrl() !== null;
}

/**
 * The database this process is configured to write to, without the credentials.
 * Used in failure logs, where knowing which database was targeted is the
 * difference between a five second fix and an hour of guessing.
 */
export function targetDatabase(): string {
  const connectionString = databaseUrl();
  if (connectionString === null) {
    return "unconfigured";
  }

  try {
    return new URL(connectionString).pathname.replace(/^\//, "") || "unknown";
  } catch {
    return "unparsable";
  }
}

/**
 * Thrown when a query is attempted with no database configured. Callers are
 * expected to check `databaseConfigured()` first and render an honest empty
 * state; this exists so a missed check fails loudly in development rather than
 * looking like an empty result set.
 */
export class DatabaseUnconfigured extends Error {
  constructor() {
    super("DATABASE_URL is not set");
    this.name = "DatabaseUnconfigured";
  }
}

function pool(connectionString: string): Pool {
  const existing = globalForPool.porcessPool;
  if (
    existing !== undefined &&
    existing.connectionString === connectionString
  ) {
    return existing.pool;
  }

  void existing?.pool.end().catch(() => undefined);

  const created = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  // A pool-level error would otherwise be an unhandled rejection.
  created.on("error", () => undefined);

  globalForPool.porcessPool = { pool: created, connectionString };
  return created;
}

/** Runs one parameterised query and returns its rows. */
export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const connectionString = databaseUrl();
  if (connectionString === null) {
    throw new DatabaseUnconfigured();
  }

  const result = await pool(connectionString).query<T>(sql, params as never[]);
  return result.rows;
}
