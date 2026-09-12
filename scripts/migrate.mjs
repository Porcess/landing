// Applies db/schema.sql. Idempotent: every statement in that file is written to
// be safely re-runnable, so `pnpm db:migrate` is the whole migration story.

import { readFile } from "node:fs/promises";

import pg from "pg";

import { envValue } from "./env.mjs";

const connectionString = await envValue("DATABASE_URL");

if (connectionString === undefined || connectionString.length === 0) {
  console.error(
    "DATABASE_URL is not set. Add it to .env (see .env.example) and rerun.",
  );
  process.exit(1);
}

const source = await readFile(new URL("../db/schema.sql", import.meta.url), {
  encoding: "utf8",
});

// Strip line comments, then split so each statement runs on its own.
const statements = source
  .split("\n")
  .map((line) => (line.trimStart().startsWith("--") ? "" : line))
  .join("\n")
  .split(";")
  .map((statement) => statement.trim())
  .filter((statement) => statement.length > 0);

if (statements.length === 0) {
  console.error("db/schema.sql contains no statements.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  for (const statement of statements) {
    await client.query(statement);
    const label = statement.split(/\s+/).slice(0, 4).join(" ");
    console.log(`applied: ${label} ...`);
  }

  const { rows } = await client.query(
    "select count(*)::int as total from early_access_signups",
  );
  console.log(`early_access_signups rows: ${rows[0]?.total ?? "unknown"}`);
} finally {
  await client.end();
}
