import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/ui/section";
import {
  discountLabel,
  formatUsd,
  offerPriceCents,
  type Offer,
} from "@/lib/offer/format";
import { getActiveOffer } from "@/lib/offer/settings";
import {
  formatNumber,
  formatProperties,
  formatUtc,
  shortVisitor,
  timeAgo,
} from "@/lib/stats/format";
import {
  readSessionCookie,
  sessionValid,
  STATS_PATH,
  statsDisabled,
} from "@/lib/stats/auth";
import {
  attribution,
  bucketLabel,
  byName,
  clicksBySource,
  failuresByReason,
  funnel,
  health,
  offerHistory,
  parseRange,
  rangeLabel,
  RANGES,
  rangeToSince,
  recentEvents,
  recentSignups,
  series,
  share,
  summarise,
  type Breakdown,
  type FunnelStep,
  type OfferChange,
  type Range,
  type TrendPoint,
} from "@/lib/stats/queries";
import { cn } from "@/lib/cn";

/**
 * The private dashboard.
 *
 * Server rendered on every request, because a cached dashboard is a dashboard
 * that lies. Everything on the page comes from one of two tables, and anything
 * that cannot be read is shown as missing rather than as zero: a strip that
 * says the database is unreachable is worth more than a chart of plausible
 * nothing.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stats",
  robots: { index: false, follow: false },
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; e?: string; offer?: string }>;
}) {
  // An unconfigured deployment does not admit that this page exists.
  if (statsDisabled()) {
    notFound();
  }

  const cookieHeader = (await headers()).get("cookie");
  const authorised = sessionValid(readSessionCookie(cookieHeader), new Date());

  const params = await searchParams;
  const range = parseRange(params.range);

  if (!authorised) {
    return <Login failed={params.e === "1"} />;
  }

  const now = new Date();
  const filter = { since: rangeToSince(range, now) };

  const [
    summary,
    trend,
    steps,
    events,
    clicks,
    failures,
    referrers,
    sources,
    media,
    campaigns,
    signups,
    tail,
    status,
    activeOffer,
    history,
  ] = await Promise.all([
    summarise(filter).catch(() => null),
    series(filter, range, now).catch(() => []),
    funnel(filter).catch(() => []),
    byName(filter).catch(() => []),
    clicksBySource(filter).catch(() => []),
    failuresByReason(filter).catch(() => []),
    attribution(filter, "referrer").catch(() => []),
    attribution(filter, "utm_source").catch(() => []),
    attribution(filter, "utm_medium").catch(() => []),
    attribution(filter, "utm_campaign").catch(() => []),
    recentSignups(25).catch(() => []),
    recentEvents(20).catch(() => []),
    health(),
    getActiveOffer(),
    offerHistory(10).catch(() => []),
  ]);

  return (
    <main className="min-h-[100dvh] py-10 sm:py-14">
      <Container className="max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-hairline-strong pb-6">
          <div>
            <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
              PORCESS · PRIVATE
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Stats
            </h1>
            <p className="mt-2 font-mono text-xs text-ink-muted">
              {rangeLabel(range)} · {formatUtc(now)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <nav aria-label="Range" className="flex flex-wrap gap-3">
              {RANGES.map((option) => (
                <Link
                  className={cn(
                    "focus-ring font-mono text-xs tracking-label uppercase transition-colors duration-150",
                    option === range
                      ? "text-ink"
                      : "text-ink-muted hover:text-ink",
                  )}
                  href={`${STATS_PATH}?range=${option}`}
                  key={option}
                  {...(option === range
                    ? { "aria-current": "true" as const }
                    : {})}
                >
                  {option}
                </Link>
              ))}
            </nav>

            <form action={`${STATS_PATH}/session`} method="post">
              <input name="intent" type="hidden" value="logout" />
              <button
                className="focus-ring border-b border-hairline font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <Health status={status} now={now} />

        {status.configured && status.reachable ? (
          <Block title="Offer">
            <OfferControl
              history={history}
              notice={params.offer}
              offer={activeOffer}
            />
          </Block>
        ) : null}

        {!status.configured ? (
          <p
            className="mt-10 border-t border-hairline-strong pt-6 text-sm text-ink-muted"
            data-stats-empty
          >
            No database is configured for this deployment, so nothing has been
            recorded yet. Set <code className="text-ink">DATABASE_URL</code> and
            run <code className="text-ink">pnpm db:migrate</code>.
          </p>
        ) : !status.reachable ? (
          <p
            className="mt-10 border-t border-hairline-strong pt-6 text-sm text-danger"
            data-stats-empty
          >
            <code className="text-ink">DATABASE_URL</code> points at{" "}
            <code className="text-ink">{status.database}</code>, but nothing
            could be read from it. The tables are most likely missing: run{" "}
            <code className="text-ink">pnpm db:migrate</code> against that
            database.
            {status.problem === null ? null : (
              <span className="mt-2 block font-mono text-xs text-ink-muted">
                {status.problem}
              </span>
            )}
          </p>
        ) : summary === null ? (
          <p
            className="mt-10 border-t border-hairline-strong pt-6 text-sm text-danger"
            data-stats-empty
          >
            The events and signups could not be read. These numbers are missing,
            not zero.
          </p>
        ) : (
          <>
            <Kpis summary={summary} />
            <Trend points={trend} range={range} />
            <Funnel steps={steps} />
          </>
        )}

        <div className="mt-16 grid gap-12 sm:mt-20 lg:grid-cols-2 lg:gap-16">
          <Block title="Clicks by source">
            <Breakdowns rows={clicks} total={summary?.clicks ?? 0} />
          </Block>

          <Block title="Why submissions failed">
            <Breakdowns rows={failures} total={summary?.failed ?? 0} />
          </Block>

          <Block title="Sections seen">
            <Breakdowns
              rows={events.filter((row) => row.label.endsWith("_section_view"))}
              total={summary?.views ?? 0}
            />
          </Block>

          <Block title="Every event">
            <Breakdowns rows={events} total={summary?.views ?? 0} />
          </Block>

          <Block title="Where they came from">
            <Breakdowns rows={referrers} total={summary?.views ?? 0} />
          </Block>

          <Block title="Campaigns">
            <div className="mt-1 space-y-6">
              <Breakdowns rows={sources} label="utm_source" />
              <Breakdowns rows={media} label="utm_medium" />
              <Breakdowns rows={campaigns} label="utm_campaign" />
            </div>
          </Block>
        </div>

        <Block
          action={
            <Link
              className="focus-ring border-b border-hairline font-mono text-xs tracking-label text-ink-muted uppercase transition-colors duration-150 hover:text-ink"
              href={`${STATS_PATH}/export`}
            >
              Download CSV
            </Link>
          }
          title="Early access list"
        >
          <Signups rows={signups} />
        </Block>

        <Block title="Latest events">
          <Tail rows={tail} now={now} />
        </Block>
      </Container>
    </main>
  );
}

type SignupRow = Awaited<ReturnType<typeof recentSignups>>[number];
type EventRow = Awaited<ReturnType<typeof recentEvents>>[number];
type HealthState = Awaited<ReturnType<typeof health>>;

/** The sign-in form. A plain form post, so it works without scripting. */
function Login({ failed }: { failed: boolean }) {
  return (
    <main className="flex min-h-[100dvh] items-center py-16">
      <Container className="max-w-sm">
        <p className="font-mono text-eyebrow tracking-eyebrow text-ink-muted uppercase">
          PORCESS · PRIVATE
        </p>

        <form action={`${STATS_PATH}/session`} className="mt-8" method="post">
          <label
            className="font-mono text-xs tracking-label text-ink-muted uppercase"
            htmlFor="password"
          >
            Password
          </label>
          <input
            autoComplete="current-password"
            className="focus-ring mt-3 h-12 w-full rounded-xs border border-hairline-strong bg-ground-raised px-4 text-base text-ink placeholder:text-ink-muted"
            id="password"
            name="password"
            required
            type="password"
          />
          <button
            className="focus-ring mt-4 h-12 w-full rounded-xs bg-ink font-mono text-xs tracking-label text-ground uppercase transition-colors duration-150 hover:bg-ink-muted"
            type="submit"
          >
            Enter
          </button>
        </form>

        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-danger">
          {failed ? "That password is not right." : ""}
        </p>
      </Container>
    </main>
  );
}

function Health({ status, now }: { status: HealthState; now: Date }) {
  const fresh = status.lastEventAt !== null;

  return (
    <div
      className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-y border-hairline py-4"
      data-stats-health
    >
      <Fact
        label="Database"
        tone={status.reachable ? "ok" : "bad"}
        value={
          status.reachable
            ? status.database
            : status.configured
              ? `${status.database}, unreadable`
              : "not configured"
        }
      />
      <Fact
        label="Last event"
        tone={fresh ? "ok" : "bad"}
        value={timeAgo(status.lastEventAt, now)}
      />
      <Fact
        label="Last signup"
        tone={status.lastSignupAt === null ? "warn" : "ok"}
        value={timeAgo(status.lastSignupAt, now)}
      />
      <Fact
        label="Events, 24h"
        tone={status.eventsLast24h > 0 ? "ok" : "warn"}
        value={formatNumber(status.eventsLast24h)}
      />
    </div>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  return (
    <div>
      <p className="font-mono text-xs tracking-label text-ink-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-sm font-medium",
          tone === "ok" && "text-ink",
          tone === "warn" && "text-ink-muted",
          tone === "bad" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Kpis({
  summary,
}: {
  summary: {
    views: number;
    visitors: number;
    clicks: number;
    started: number;
    failed: number;
    submitted: number;
    signups: number;
  };
}) {
  const figures = [
    { label: "Page views", value: formatNumber(summary.views) },
    { label: "Visitors", value: formatNumber(summary.visitors) },
    { label: "Signups", value: formatNumber(summary.signups) },
    {
      label: "Conversion",
      value: `${String(share(summary.signups, summary.visitors))}%`,
      hint: "signups per visitor",
    },
    {
      label: "Failed attempts",
      value: formatNumber(summary.failed),
      hint: "validation and server",
    },
  ];

  return (
    <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {figures.map((figure) => (
        <div
          className="border-t border-hairline-strong pt-4"
          key={figure.label}
        >
          <dt className="font-mono text-xs tracking-label text-ink-muted uppercase">
            {figure.label}
          </dt>
          <dd className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">
            {figure.value}
          </dd>
          {figure.hint === undefined ? null : (
            <p className="mt-1 text-xs text-ink-muted">{figure.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}

/**
 * Views and signups on one scale, as bars.
 *
 * Signups are a small fraction of views by nature, so this is deliberately a
 * shape rather than a comparison: what it answers is "when", not "how many
 * relative to each other". The exact numbers live in the tables below.
 */
function Trend({ points, range }: { points: TrendPoint[]; range: Range }) {
  if (points.length === 0) {
    return (
      <Block title="Activity">
        <p className="text-sm text-ink-muted">
          No activity recorded in this range yet.
        </p>
      </Block>
    );
  }

  const peak = points.reduce(
    (best, point) => (point.views > best.views ? point : best),
    points[0] as TrendPoint,
  );
  const max = Math.max(1, peak.views);

  return (
    <Block title="Activity">
      <div
        aria-label={`Page views per ${range === "24h" ? "hour" : "day"} over the ${rangeLabel(range)}, peaking at ${String(peak.views)} on ${bucketLabel(peak.bucket, range)}.${" "}${String(points.reduce((total, point) => total + point.signups, 0))} signups in the same range.`}
        className="flex h-40 items-end gap-px"
        role="img"
        // The plot widens with the data instead of always filling the column.
        // Without this, a single bucket draws one bar the width of the page,
        // which reads as a progress bar rather than as a chart.
        style={{ maxWidth: `${String(points.length * 48)}px` }}
      >
        {points.map((point) => (
          <div
            className="flex h-full min-w-px flex-1 flex-col justify-end gap-px"
            key={point.bucket}
            title={`${bucketLabel(point.bucket, range)}: ${String(point.views)} views, ${String(point.signups)} signups`}
          >
            {point.signups > 0 ? (
              <div
                className="bg-ink"
                style={{ height: `${String((point.signups / max) * 100)}%` }}
              />
            ) : null}
            <div
              className="bg-hairline-strong"
              style={{ height: `${String((point.views / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-between font-mono text-xs text-ink-muted">
        <span>{bucketLabel(points[0]?.bucket ?? 0, range)}</span>
        <span>highest {formatNumber(max)} views</span>
        <span>
          {bucketLabel(points[points.length - 1]?.bucket ?? 0, range)}
        </span>
      </div>
    </Block>
  );
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) {
    return null;
  }

  const first = steps[0]?.count ?? 0;

  return (
    <Block title="Funnel">
      <ol className="mt-1">
        {steps.map((step) => (
          <li
            className="grid grid-cols-12 items-baseline gap-x-4 border-t border-hairline py-4 last:border-b"
            key={step.label}
          >
            <span className="col-span-6 text-sm text-ink sm:col-span-4">
              {step.label}
            </span>
            <span className="col-span-3 font-display text-lg font-semibold text-ink tabular-nums sm:col-span-2">
              {formatNumber(step.count)}
            </span>
            <span className="col-span-3 font-mono text-xs text-ink-muted sm:col-span-2">
              {step.fromPrevious === null
                ? "entry"
                : `${String(step.fromPrevious)}% of previous`}
            </span>
            <span className="col-span-12 mt-2 sm:col-span-4 sm:mt-0">
              <span
                aria-hidden="true"
                className="block h-1 bg-ink"
                style={{ width: `${String(share(step.count, first))}%` }}
              />
            </span>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function Block({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="mt-14 first:mt-10 sm:mt-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-xs tracking-label text-ink-muted uppercase">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Breakdowns({
  rows,
  total,
  label,
}: {
  rows: Breakdown[];
  total?: number;
  label?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="border-t border-hairline pt-3 text-sm text-ink-muted">
        Nothing recorded.
      </p>
    );
  }

  return (
    <div>
      {label === undefined ? null : (
        <p className="font-mono text-xs text-ink-muted">{label}</p>
      )}
      <dl>
        {rows.map((row) => (
          <div
            className="flex items-baseline justify-between gap-4 border-t border-hairline py-2"
            key={row.label}
          >
            <dt className="truncate text-sm text-ink" title={row.label}>
              {row.label}
            </dt>
            <dd className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
              {formatNumber(row.count)}
              {total === undefined || total === 0
                ? ""
                : ` · ${String(share(row.count, total))}%`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Signups({ rows }: { rows: SignupRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="border-t border-hairline pt-3 text-sm text-ink-muted">
        No signups yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          The most recent early access signups, newest first
        </caption>
        <thead>
          <tr className="border-y border-hairline text-left">
            <Th>Email</Th>
            <Th>When</Th>
            <Th>Offer</Th>
            <Th>Source</Th>
            <Th>Campaign</Th>
            <Th>Referrer</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="border-b border-hairline"
              key={`${row.email}-${row.createdAt.toISOString()}`}
            >
              <td className="py-3 pr-4 whitespace-nowrap text-ink">
                {row.email}
              </td>
              <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-ink-muted">
                {formatUtc(row.createdAt)}
              </td>
              <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-ink-muted">
                {discountLabel(row.offerPercent)}{" "}
                {formatUsd(
                  offerPriceCents({
                    percent: row.offerPercent,
                    basePriceCents: row.basePriceCents,
                  }),
                )}
              </td>
              <td className="py-3 pr-4 text-ink-muted">
                {row.utmSource ?? "direct"}
              </td>
              <td className="py-3 pr-4 text-ink-muted">
                {row.utmCampaign ?? "none"}
              </td>
              <td className="max-w-xs truncate py-3 pr-4 text-ink-muted">
                {row.referrer ?? "none"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tail({ rows, now }: { rows: EventRow[]; now: Date }) {
  if (rows.length === 0) {
    return (
      <p className="border-t border-hairline pt-3 text-sm text-ink-muted">
        No events yet.
      </p>
    );
  }

  return (
    <ul className="mt-1">
      {rows.map((row, index) => (
        <li
          className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-hairline py-2 last:border-b"
          key={`${row.name}-${String(index)}-${row.occurredAt.toISOString()}`}
        >
          <span className="font-mono text-xs text-ink">{row.name}</span>
          <span className="font-mono text-xs text-ink-muted">{row.path}</span>
          <span className="font-mono text-xs text-ink-muted">
            {shortVisitor(row.visitor)}
          </span>
          {formatProperties(row.properties) === "" ? null : (
            <span className="font-mono text-xs text-ink-muted">
              {formatProperties(row.properties)}
            </span>
          )}
          <span className="ml-auto font-mono text-xs text-ink-muted">
            {timeAgo(row.occurredAt, now)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      className="py-2 pr-4 font-mono text-xs font-normal tracking-label text-ink-muted uppercase"
      scope="col"
    >
      {children}
    </th>
  );
}

/** The message for an offer write, or null when there is nothing to say. */
function offerNotice(notice: string | undefined): string | null {
  switch (notice) {
    case "saved":
      return "Offer saved. New signups lock in this offer.";
    case "invalid":
      return "That offer was not valid. The discount is 0 to 99 and the base price is a positive number of cents.";
    case "unconfigured":
      return "No database is configured, so the offer could not be saved.";
    case "failed":
      return "The offer could not be saved. Nothing changed.";
    default:
      return null;
  }
}

/**
 * The one place the offer is changed.
 *
 * A plain form post, so it works without scripting and cannot be triggered by a
 * cross-site request. The history below it is read-only and append-only: it is
 * what lets an operator see the sequence of offers without trusting the page
 * they happened to be looking at when each change was made.
 */
function OfferControl({
  offer,
  history,
  notice,
}: {
  offer: Offer;
  history: OfferChange[];
  notice?: string;
}) {
  const message = offerNotice(notice);

  return (
    <div>
      {message === null ? null : (
        <p
          className={
            notice === "saved" ? "text-sm text-ink" : "text-sm text-danger"
          }
          {...(notice === "saved" ? {} : { role: "alert" as const })}
        >
          {message}
        </p>
      )}

      <p className="mt-1 font-display text-2xl font-semibold text-ink">
        {discountLabel(offer.percent)} · {formatUsd(offerPriceCents(offer))}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {formatUsd(offerPriceCents(offer))} of {formatUsd(offer.basePriceCents)}{" "}
        list price
      </p>

      <form
        action={`${STATS_PATH}/offer`}
        className="mt-6 flex flex-wrap items-end gap-4"
        method="post"
      >
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs tracking-label text-ink-muted uppercase">
            Discount percent
          </span>
          <input
            className="focus-ring h-10 w-28 rounded-xs border border-hairline-strong bg-ground-raised px-3 text-sm text-ink tabular-nums"
            defaultValue={offer.percent}
            inputMode="numeric"
            name="percent"
            pattern="[0-9]{1,2}"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs tracking-label text-ink-muted uppercase">
            Base price, cents
          </span>
          <input
            className="focus-ring h-10 w-40 rounded-xs border border-hairline-strong bg-ground-raised px-3 text-sm text-ink tabular-nums"
            defaultValue={offer.basePriceCents}
            inputMode="numeric"
            name="basePriceCents"
            pattern="[0-9]{1,6}"
            required
          />
        </label>

        <button
          className="focus-ring h-10 rounded-xs bg-ink px-5 font-mono text-xs tracking-label text-ground uppercase transition-colors duration-150 hover:bg-ink-muted"
          type="submit"
        >
          Save offer
        </button>
      </form>

      <p className="mt-3 text-xs text-ink-muted">
        The base price is in cents, so $20 is 2000. Signups lock in whatever is
        active when they join; existing signups are never rewritten.
      </p>

      <div className="mt-8">
        <p className="font-mono text-xs tracking-label text-ink-muted uppercase">
          History
        </p>
        {history.length === 0 ? (
          <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-muted">
            No offer changes recorded yet.
          </p>
        ) : (
          <ul className="mt-1">
            {history.map((change) => (
              <li
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-hairline py-2 last:border-b"
                key={`${change.changedAt.toISOString()}-${String(change.percent)}-${String(change.basePriceCents)}`}
              >
                <span className="font-display text-sm font-medium text-ink">
                  {discountLabel(change.percent)} ·{" "}
                  {formatUsd(offerPriceCents(change))}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  {change.previousPercent === null
                    ? "initial"
                    : `was ${discountLabel(change.previousPercent)}`}
                </span>
                <span className="ml-auto font-mono text-xs text-ink-muted">
                  {formatUtc(change.changedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
