/** Presentation helpers for the dashboard. Pure, so they can be tested. */

/** Thousands separators, so a five figure number is readable at a glance. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** `2026-09-12 09:46 UTC`, which is the only timezone this page reports in. */
export function formatUtc(date: Date | null): string {
  if (date === null) {
    return "never";
  }

  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * A short, human distance from now. Deliberately coarse: "3h ago" answers
 * "is this fresh" and a precise duration does not answer anything better.
 */
export function timeAgo(date: Date | null, now: Date): string {
  if (date === null) {
    return "never";
  }

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) {
    return "just now";
  }
  if (seconds < 60) {
    return `${String(seconds)}s ago`;
  }
  if (seconds < 3600) {
    return `${String(Math.floor(seconds / 60))}m ago`;
  }
  if (seconds < 86_400) {
    return `${String(Math.floor(seconds / 3600))}h ago`;
  }

  return `${String(Math.floor(seconds / 86_400))}d ago`;
}

/** A visitor id shortened for a table cell, or a marker when there is none. */
export function shortVisitor(visitor: string | null): string {
  if (visitor === null) {
    return "anonymous";
  }

  return visitor.slice(0, 8);
}

/** `{ a: 1 }` as `a=1`, with long values cut, for the raw event tail. */
export function formatProperties(properties: Record<string, unknown>): string {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => `${key}=${String(value).slice(0, 24)}`)
    .join(" ");
}
