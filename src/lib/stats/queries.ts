/**
 * Every number the dashboard shows, read from the two tables that exist.
 *
 * The shaping helpers are pure and exported separately from the queries that
 * feed them, so the arithmetic that matters can be tested without a database:
 * gap filling, funnel conversion, and percentage shares are exactly the places
 * a dashboard quietly lies to you when they are wrong.
 *
 * All bucketing happens in UTC. `occurred_at` is a `timestamptz`, and a
 * `date_trunc` over it would silently use the database session's timezone, so
 * every bucket is converted explicitly and returned as an epoch second rather
 * than a timestamp. A timestamp without a zone would come back to Node and be
 * re-read as local time, which is how a day boundary drifts by one.
 */

import { databaseConfigured, query, targetDatabase } from "@/lib/db";

export const RANGES = ["24h", "7d", "30d", "all"] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(value: string | undefined): Range {
  return RANGES.includes(value as Range) ? (value as Range) : "7d";
}

export function rangeLabel(range: Range): string {
  switch (range) {
    case "24h":
      return "last 24 hours";
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
    case "all":
      return "all time";
  }
}

/**
 * When a range begins, or null for all time. Pure so the boundary is testable:
 * an off-by-one here moves a day of signups between reports.
 */
export function rangeToSince(range: Range, now: Date): Date | null {
  const hours: Record<Exclude<Range, "all">, number> = {
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };

  if (range === "all") {
    return null;
  }

  return new Date(now.getTime() - hours[range] * 60 * 60 * 1000);
}

/** Hourly buckets for a single day, daily for anything longer. */
export function bucketFor(range: Range): "hour" | "day" {
  return range === "24h" ? "hour" : "day";
}

export type EventCounts = {
  views: number;
  visitors: number;
  clicks: number;
  started: number;
  failed: number;
  submitted: number;
};

export type Summary = EventCounts & { signups: number };

export type TrendPoint = {
  /** Epoch seconds, UTC, at the start of the bucket. */
  bucket: number;
  views: number;
  visitors: number;
  signups: number;
};

export type FunnelStep = {
  label: string;
  count: number;
  /** Share of the step before it, or null for the first step. */
  fromPrevious: number | null;
  /** Share of the first step, or null for the first step. */
  fromFirst: number | null;
};

export type Breakdown = { label: string; count: number };

/** `part` of `total` as a percentage, rounded, and 0 when there is no total. */
export function share(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Turns counted steps into a funnel.
 *
 * Percentages are computed against the previous step and against the first, and
 * deliberately not clamped: a later step genuinely can exceed an earlier one
 * (a visitor who reloads and submits twice, or one who signs up without the
 * click event surviving a blocker), and a report that hides that is worse than
 * one that shows it.
 */
export function buildFunnel(
  steps: { label: string; count: number }[],
): FunnelStep[] {
  const first = steps[0]?.count ?? 0;

  return steps.map((step, index) => {
    const previous = index === 0 ? null : (steps[index - 1]?.count ?? 0);
    return {
      label: step.label,
      count: step.count,
      fromPrevious: previous === null ? null : share(step.count, previous),
      fromFirst: index === 0 ? null : share(step.count, first),
    };
  });
}

/**
 * Merges the event series with the signup series and fills every gap.
 *
 * Without the fill, a quiet Tuesday simply disappears from the chart and the
 * line draws straight from Monday to Wednesday, which reads as continuous
 * activity across a day that had none.
 */
export function mergeSeries(
  events: { bucket: number; views: number; visitors: number }[],
  signups: { bucket: number; count: number }[],
  range: Range,
  now: Date,
): TrendPoint[] {
  if (events.length === 0 && signups.length === 0) {
    return [];
  }

  const step = bucketFor(range) === "hour" ? 3600 : 86400;
  const signupByBucket = new Map(signups.map((row) => [row.bucket, row.count]));
  const eventByBucket = new Map(events.map((row) => [row.bucket, row]));

  const buckets = [
    ...events.map((row) => row.bucket),
    ...signups.map((row) => row.bucket),
  ];

  // The series always runs to the bucket containing now, so the current day or
  // hour is on the chart even when nothing has happened in it yet, and so the
  // fill below covers the gap between the last event and the present.
  const current = Math.floor(now.getTime() / 1000 / step) * step;
  const newest = Math.max(current, ...buckets);
  const oldest = Math.min(...buckets);

  const points: TrendPoint[] = [];
  for (let bucket = oldest; bucket <= newest; bucket += step) {
    const event = eventByBucket.get(bucket);
    points.push({
      bucket,
      views: event?.views ?? 0,
      visitors: event?.visitors ?? 0,
      signups: signupByBucket.get(bucket) ?? 0,
    });
  }

  return points;
}

/** `YYYY-MM-DD` for a day bucket, in UTC. */
export function bucketLabel(epochSeconds: number, range: Range): string {
  const iso = new Date(epochSeconds * 1000).toISOString();
  return range === "24h" ? `${iso.slice(11, 16)}` : iso.slice(0, 10);
}

type Filter = { since: Date | null };

function rangeClause(filter: Filter, column: string, index: number): string {
  return filter.since === null
    ? "true"
    : `${column} >= $${String(index)}::timestamptz`;
}

function rangeParams(filter: Filter): unknown[] {
  return filter.since === null ? [] : [filter.since.toISOString()];
}

export async function summarise(filter: Filter): Promise<Summary> {
  const events = await query<{
    views: number;
    visitors: number;
    clicks: number;
    started: number;
    failed: number;
    submitted: number;
  }>(
    `select
       count(*) filter (where name = 'page_view')::int as views,
       count(distinct visitor)::int as visitors,
       count(*) filter (where name = 'early_access_cta_clicked')::int as clicks,
       count(*) filter (where name = 'email_started')::int as started,
       count(*) filter (where name = 'email_failed')::int as failed,
       count(*) filter (where name = 'email_submitted')::int as submitted
     from analytics_events
     where ${rangeClause(filter, "occurred_at", 1)}`,
    rangeParams(filter),
  );

  const signups = await query<{ total: number }>(
    `select count(*)::int as total
     from early_access_signups
     where ${rangeClause(filter, "created_at", 1)}`,
    rangeParams(filter),
  );

  const row = events[0];

  return {
    views: row?.views ?? 0,
    visitors: row?.visitors ?? 0,
    clicks: row?.clicks ?? 0,
    started: row?.started ?? 0,
    failed: row?.failed ?? 0,
    submitted: row?.submitted ?? 0,
    signups: signups[0]?.total ?? 0,
  };
}

export async function series(
  filter: Filter,
  range: Range,
  now: Date,
): Promise<TrendPoint[]> {
  const bucket = bucketFor(range);

  const events = await query<{
    bucket: number;
    views: number;
    visitors: number;
  }>(
    `select
       extract(epoch from date_trunc('${bucket}', occurred_at at time zone 'UTC'))::int as bucket,
       count(*) filter (where name = 'page_view')::int as views,
       count(distinct visitor)::int as visitors
     from analytics_events
     where ${rangeClause(filter, "occurred_at", 1)}
     group by 1
     order by 1`,
    rangeParams(filter),
  );

  const signups = await query<{ bucket: number; count: number }>(
    `select
       extract(epoch from date_trunc('${bucket}', created_at at time zone 'UTC'))::int as bucket,
       count(*)::int as count
     from early_access_signups
     where ${rangeClause(filter, "created_at", 1)}
     group by 1
     order by 1`,
    rangeParams(filter),
  );

  return mergeSeries(events, signups, range, now);
}

export async function funnel(filter: Filter): Promise<FunnelStep[]> {
  const summary = await summarise(filter);

  return buildFunnel([
    { label: "Page views", count: summary.views },
    { label: "Clicked the offer", count: summary.clicks },
    { label: "Started typing", count: summary.started },
    { label: "Submitted", count: summary.submitted },
    { label: "On the list", count: summary.signups },
  ]);
}

export async function byName(filter: Filter): Promise<Breakdown[]> {
  const rows = await query<{ name: string; count: number }>(
    `select name, count(*)::int as count
     from analytics_events
     where ${rangeClause(filter, "occurred_at", 1)}
     group by 1
     order by count desc, name`,
    rangeParams(filter),
  );

  return rows.map((row) => ({ label: row.name, count: row.count }));
}

/** Which button or placement a click came from, for the click events only. */
export async function clicksBySource(filter: Filter): Promise<Breakdown[]> {
  const rows = await query<{ label: string; count: number }>(
    `select
       coalesce(properties ->> 'source', properties ->> 'placement', 'unknown') as label,
       count(*)::int as count
     from analytics_events
     where name = 'early_access_cta_clicked'
       and ${rangeClause(filter, "occurred_at", 1)}
     group by 1
     order by count desc, label`,
    rangeParams(filter),
  );

  return rows.map((row) => ({ label: row.label, count: row.count }));
}

/** Why submissions failed, so a drop off in the funnel has an explanation. */
export async function failuresByReason(filter: Filter): Promise<Breakdown[]> {
  const rows = await query<{ label: string; count: number }>(
    `select coalesce(properties ->> 'reason', 'unknown') as label,
            count(*)::int as count
     from analytics_events
     where name = 'email_failed'
       and ${rangeClause(filter, "occurred_at", 1)}
     group by 1
     order by count desc, label`,
    rangeParams(filter),
  );

  return rows.map((row) => ({ label: row.label, count: row.count }));
}

export async function attribution(
  filter: Filter,
  column: "referrer" | "utm_source" | "utm_medium" | "utm_campaign",
): Promise<Breakdown[]> {
  const rows = await query<{ label: string; count: number }>(
    `select ${column} as label, count(*)::int as count
     from analytics_events
     where ${column} is not null
       and name = 'page_view'
       and ${rangeClause(filter, "occurred_at", 1)}
     group by 1
     order by count desc, label
     limit 8`,
    rangeParams(filter),
  );

  return rows.map((row) => ({ label: row.label, count: row.count }));
}

export type SignupRow = {
  email: string;
  createdAt: Date;
  referrer: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  landingPageVersion: string;
};

export async function recentSignups(limit: number): Promise<SignupRow[]> {
  return query<SignupRow>(
    `select email,
            created_at as "createdAt",
            referrer,
            utm_source as "utmSource",
            utm_campaign as "utmCampaign",
            landing_page_version as "landingPageVersion"
     from early_access_signups
     order by created_at desc
     limit $1::int`,
    [limit],
  );
}

export type RecentEvent = {
  name: string;
  path: string;
  visitor: string | null;
  occurredAt: Date;
  properties: Record<string, unknown>;
  referrer: string | null;
};

export async function recentEvents(limit: number): Promise<RecentEvent[]> {
  return query<RecentEvent>(
    `select name,
            path,
            visitor,
            occurred_at as "occurredAt",
            properties,
            referrer
     from analytics_events
     order by occurred_at desc
     limit $1::int`,
    [limit],
  );
}

export type Health = {
  database: string;
  configured: boolean;
  lastEventAt: Date | null;
  lastSignupAt: Date | null;
  eventsLast24h: number;
};

/**
 * Whether the pipeline is alive, which is the question the dashboard exists to
 * answer first. Reported as data rather than as a status code, so the page can
 * be honest about a missing database instead of failing to render.
 */
export async function health(): Promise<Health> {
  if (!databaseConfigured()) {
    return {
      database: targetDatabase(),
      configured: false,
      lastEventAt: null,
      lastSignupAt: null,
      eventsLast24h: 0,
    };
  }

  try {
    const rows = await query<{
      lastEventAt: Date | null;
      lastSignupAt: Date | null;
      eventsLast24h: number;
    }>(
      `select
         (select max(occurred_at) from analytics_events) as "lastEventAt",
         (select max(created_at) from early_access_signups) as "lastSignupAt",
         (select count(*)::int from analytics_events
           where occurred_at >= now() - interval '24 hours') as "eventsLast24h"`,
    );

    const row = rows[0];

    return {
      database: targetDatabase(),
      configured: true,
      lastEventAt: row?.lastEventAt ?? null,
      lastSignupAt: row?.lastSignupAt ?? null,
      eventsLast24h: row?.eventsLast24h ?? 0,
    };
  } catch {
    // Either the database is unreachable or the tables are not there yet. Both
    // are reported as a dashboard that says so, never as a page that fails.
    return {
      database: targetDatabase(),
      configured: false,
      lastEventAt: null,
      lastSignupAt: null,
      eventsLast24h: 0,
    };
  }
}
