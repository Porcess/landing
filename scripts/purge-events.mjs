// Deletes events older than the retention window.
//
// The analytics table is the only one here that grows on its own, and it shares
// a database with the platform, so leaving it unbounded is not a neutral
// choice. Defaults to a year, which is longer than any pre-launch question
// needs and short enough that the table stays small.

import pg from "pg";

const RETENTION_DAYS = Number(process.env.STATS_RETENTION_DAYS ?? "365");

const connectionString = process.env.DATABASE_URL;

if (connectionString === undefined || connectionString.length === 0) {
  console.error(
    "DATABASE_URL is not set. Add it to .env (see .env.example) and rerun.",
  );
  process.exit(1);
}

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 1) {
  console.error("STATS_RETENTION_DAYS must be a positive number of days.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  // Signups are never purged. They are the list, and the whole point of the
  // page is that people asked to be told when it launches.
  const removed = await client.query(
    `with removed as (
       delete from analytics_events
       where occurred_at < now() - ($1::text || ' days')::interval
       returning 1
     )
     select count(*)::int as count from removed`,
    [String(Math.trunc(RETENTION_DAYS))],
  );

  const kept = await client.query(
    "select count(*)::int as count from analytics_events",
  );

  const signups = await client.query(
    "select count(*)::int as count from early_access_signups",
  );

  console.log(`retention: ${String(Math.trunc(RETENTION_DAYS))} days`);
  console.log(`events removed: ${removed.rows[0]?.count ?? 0}`);
  console.log(`events remaining: ${kept.rows[0]?.count ?? 0}`);
  console.log(`signups untouched: ${signups.rows[0]?.count ?? 0}`);
} finally {
  await client.end();
}
