/**
 * The persistence behind the early-access list: one table of signups.
 *
 * The connection is shared with the rest of the server (`@/lib/db`), so the
 * stats queries cannot open a pool of their own beside this one.
 *
 * Isolation is enforced by the database, not by a read-then-write check, so two
 * simultaneous submissions of the same address cannot both be treated as new.
 *
 * Each row snapshots the offer that was active at signup. The read of the active
 * offer and the insert are two statements rather than one: the offer read goes
 * through `getActiveOffer`, which already knows how to fall back when the
 * database is missing or the offer table has not been migrated yet. The window
 * between them is milliseconds and both outcomes are valid offers, which is a
 * better trade than a single statement that cannot start when the offer table is
 * absent.
 */

import type { Attribution } from "@/lib/attribution";
import { databaseUrl, query, targetDatabase } from "@/lib/db";
import { getActiveOffer } from "@/lib/offer/settings";
import { LANDING_VERSION } from "@/lib/site";

export { targetDatabase };

export type SignupInput = {
  email: string;
  emailNormalized: string;
  attribution: Attribution;
};

export type SignupOffer = { percent: number; basePriceCents: number };

export type SignupResult =
  | { status: "subscribed"; id: string; offer: SignupOffer }
  | { status: "already_subscribed"; offer: SignupOffer | null }
  | { status: "unconfigured" };

/** Postgres `undefined_column`: the offer migration has not run yet. */
function isUndefinedColumn(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "42703"
  );
}

export async function insertSignup(input: SignupInput): Promise<SignupResult> {
  const connectionString = databaseUrl();
  if (connectionString === null) {
    return { status: "unconfigured" };
  }

  const { email, emailNormalized, attribution } = input;
  const active = await getActiveOffer();

  const attributionParams = [
    attribution.referrer,
    LANDING_VERSION,
    attribution.utmSource,
    attribution.utmMedium,
    attribution.utmCampaign,
    attribution.utmContent,
    attribution.utmTerm,
  ];

  // `returning id` plus `do nothing` is the dedupe: no row back means the
  // address was already on the list.
  const withOffer = () =>
    query<{ id: string }>(
      `insert into early_access_signups (
         email,
         email_normalized,
         referrer,
         landing_page_version,
         utm_source,
         utm_medium,
         utm_campaign,
         utm_content,
         utm_term,
         offer_percent,
         base_price_cents
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (email_normalized) do nothing
       returning id`,
      [
        email,
        emailNormalized,
        ...attributionParams,
        active.percent,
        active.basePriceCents,
      ],
    );

  // The pre-offer schema, for a database that has not been migrated. Falling back
  // keeps signups working; the row simply carries the schema defaults.
  const withoutOffer = () =>
    query<{ id: string }>(
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
      [email, emailNormalized, ...attributionParams],
    );

  let rows: { id: string }[];
  try {
    rows = await withOffer();
  } catch (error) {
    if (!isUndefinedColumn(error)) {
      throw error;
    }
    rows = await withoutOffer();
  }

  const first = rows[0];
  if (first === undefined) {
    return {
      status: "already_subscribed",
      offer: await storedOffer(emailNormalized),
    };
  }

  return { status: "subscribed", id: first.id, offer: active };
}

/**
 * The offer a returning visitor locked in, so the confirmation repeats their
 * offer rather than the one that happens to be live now.
 */
async function storedOffer(
  emailNormalized: string,
): Promise<SignupOffer | null> {
  try {
    const rows = await query<{
      percent: number;
      basePriceCents: number;
    }>(
      `select offer_percent as percent, base_price_cents as "basePriceCents"
       from early_access_signups
       where email_normalized = $1`,
      [emailNormalized],
    );

    const row = rows[0];
    return row === undefined
      ? null
      : { percent: row.percent, basePriceCents: row.basePriceCents };
  } catch {
    // Un-migrated schema, or an unreadable row. The confirmation falls back to
    // the active offer rather than claiming an offer it cannot verify.
    return null;
  }
}
