/**
 * Writing events, and the retention that keeps them bounded.
 *
 * Deliberately the thinnest layer that can sit under the endpoint: validate,
 * insert, done. Aggregation lives in `@/lib/stats/queries`, so a bug in the
 * dashboard cannot corrupt what is recorded.
 */

import type { Attribution } from "@/lib/attribution";
import type {
  AnalyticsEventName,
  AnalyticsProperties,
} from "@/lib/analytics-events";
import { databaseUrl, query } from "@/lib/db";
import { LANDING_VERSION } from "@/lib/site";

export type EventInput = {
  name: AnalyticsEventName;
  path: string;
  visitor: string | null;
  properties: AnalyticsProperties;
  attribution: Attribution;
};

export type EventResult = { status: "stored" } | { status: "unconfigured" };

export async function insertEvent(input: EventInput): Promise<EventResult> {
  if (databaseUrl() === null) {
    return { status: "unconfigured" };
  }

  const { name, path, visitor, properties, attribution } = input;

  // `occurred_at` is left to the column default: the server's clock is the only
  // clock that cannot be set by the visitor.
  await query(
    `insert into analytics_events (
       name,
       path,
       visitor,
       landing_page_version,
       properties,
       referrer,
       utm_source,
       utm_medium,
       utm_campaign,
       utm_content,
       utm_term
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      name,
      path,
      visitor,
      LANDING_VERSION,
      JSON.stringify(properties),
      attribution.referrer,
      attribution.utmSource,
      attribution.utmMedium,
      attribution.utmCampaign,
      attribution.utmContent,
      attribution.utmTerm,
    ],
  );

  return { status: "stored" };
}

/**
 * Deletes events older than `days` and reports how many went.
 *
 * Exists so the table cannot grow without bound on a database that is also
 * hosting the platform. Run by `pnpm stats:purge`.
 */
export async function purgeEvents(days: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `with removed as (
       delete from analytics_events
       where occurred_at < now() - ($1::text || ' days')::interval
       returning 1
     )
     select count(*)::text as count from removed`,
    [String(Math.max(1, Math.trunc(days)))],
  );

  return Number(rows[0]?.count ?? "0");
}
