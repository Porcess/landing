/**
 * The persistence behind the early-access list: one table of signups.
 *
 * The connection is shared with the rest of the server (`@/lib/db`), so the
 * stats queries cannot open a pool of their own beside this one.
 *
 * Isolation is enforced by the database, not by a read-then-write check, so two
 * simultaneous submissions of the same address cannot both be treated as new.
 */

import type { Attribution } from "@/lib/attribution";
import { databaseUrl, query, targetDatabase } from "@/lib/db";
import { LANDING_VERSION } from "@/lib/site";

export { targetDatabase };

export type SignupInput = {
  email: string;
  emailNormalized: string;
  attribution: Attribution;
};

export type SignupResult =
  | { status: "subscribed"; id: string }
  | { status: "already_subscribed" }
  | { status: "unconfigured" };

export async function insertSignup(input: SignupInput): Promise<SignupResult> {
  const connectionString = databaseUrl();
  if (connectionString === null) {
    return { status: "unconfigured" };
  }

  const { email, emailNormalized, attribution } = input;

  // `returning id` plus `do nothing` is the dedupe: no row back means the
  // address was already on the list.
  const rows = await query<{ id: string }>(
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

  const first = rows[0];
  if (first === undefined) {
    return { status: "already_subscribed" };
  }

  return { status: "subscribed", id: first.id };
}
