/**
 * The only persistence in this repository: one table of early-access signups.
 *
 * Uses `pg`, which speaks the standard PostgreSQL wire protocol, so the same
 * code path runs against a local Postgres in development and against a hosted
 * Postgres in production. (The Neon HTTP driver was rejected for this reason: it
 * only talks to Neon's proxy, which made the whole signup path impossible to
 * exercise locally. A hosted Postgres, including Neon, accepts `pg` directly.)
 *
 * Isolation is enforced by the database, not by a read-then-write check, so two
 * simultaneous submissions of the same address cannot both be treated as new.
 */

import { Pool } from "pg";

import type { Attribution } from "@/lib/attribution";
import { LANDING_VERSION } from "@/lib/site";

export type SignupInput = {
  email: string;
  emailNormalized: string;
  attribution: Attribution;
};

export type SignupResult =
  | { status: "subscribed"; id: string }
  | { status: "already_subscribed" }
  | { status: "unconfigured" };

/**
 * One pool per process, cached across hot reloads and route invocations.
 *
 * The pool is deliberately small: a hosted Postgres offered through a pooled
 * endpoint already multiplexes server connections, and a serverless host scales
 * by instance, so a large per-instance pool only multiplies connections rather
 * than throughput.
 */
const globalForPool = globalThis as unknown as {
  porcessPool?: { pool: Pool; connectionString: string };
};

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

/**
 * The database this process is configured to write to, without the credentials.
 * Used in failure logs, where knowing which database was targeted is the
 * difference between a five second fix and an hour of guessing.
 */
export function targetDatabase(): string {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.length === 0) {
    return "unconfigured";
  }

  try {
    return new URL(connectionString).pathname.replace(/^\//, "") || "unknown";
  } catch {
    return "unparsable";
  }
}

export async function insertSignup(input: SignupInput): Promise<SignupResult> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.length === 0) {
    return { status: "unconfigured" };
  }

  const { email, emailNormalized, attribution } = input;

  // `returning id` plus `do nothing` is the dedupe: no row back means the
  // address was already on the list.
  const result = await pool(connectionString).query<{ id: string }>(
    `insert into early_access_signups (
       email,
       email_normalized,
       referrer,
       landing_page_version,
       utm_source,
       utm_medium,
       utm_campaign,
       utm_content,
       utm_term
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (email_normalized) do nothing
     returning id`,
    [
      email,
      emailNormalized,
      attribution.referrer,
      LANDING_VERSION,
      attribution.utmSource,
      attribution.utmMedium,
      attribution.utmCampaign,
      attribution.utmContent,
      attribution.utmTerm,
    ],
  );

  const first = result.rows[0];
  if (first === undefined) {
    return { status: "already_subscribed" };
  }

  return { status: "subscribed", id: first.id };
}
