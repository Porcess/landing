/** Deployment-independent configuration shared by the page and the route. */

/**
 * Which version of the landing page captured a signup. A code constant rather
 * than an env value so a stored row can never disagree with the build that
 * produced it.
 */
export const LANDING_VERSION = "v1";

const FALLBACK_SITE_URL = "https://porcess.com";

/**
 * The canonical origin. Empty, whitespace-only, or unparsable
 * `NEXT_PUBLIC_SITE_URL` values fall back to the production origin instead of
 * throwing during static prerender (Vercel reports this as
 * `Failed to collect configuration for /_not-found` with `ERR_INVALID_URL`).
 */
function resolveSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (raw.length === 0) {
    return FALLBACK_SITE_URL;
  }
  try {
    return new URL(raw).toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SECTION = {
  main: "main-content",
  earlyAccess: "early-access",
  agents: "agents",
  howItWorks: "how-it-works",
} as const;

/**
 * The private area: the stats dashboard and its endpoints.
 *
 * One constant used by robots, by the page's metadata, and by analytics, so the
 * three can never disagree about what counts as private. Analytics in
 * particular must skip it: a dashboard that counted its own visits would report
 * the numbers it is being read to check.
 */
export const PRIVATE_PREFIX = "/a/";

/**
 * Where the page sends its events.
 *
 * Defaults to this site's own endpoint, so a deployment records its numbers
 * without anyone having to configure anything, and no third party ever sees a
 * visitor. The environment variable is an override for pointing the page at a
 * different collector, not a switch that has to be flipped for analytics to
 * work at all.
 */
export function analyticsEndpoint(): string {
  const value = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  return value && value.length > 0 ? value : "/analytics";
}
