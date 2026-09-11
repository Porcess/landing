/** Deployment-independent configuration shared by the page and the route. */

/**
 * Which version of the landing page captured a signup. A code constant rather
 * than an env value so a stored row can never disagree with the build that
 * produced it.
 */
export const LANDING_VERSION = "v1";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://porcess.com"
).replace(/\/+$/, "");

export const SECTION = {
  main: "main-content",
  earlyAccess: "early-access",
} as const;

/** Attributes every analytics event so multi-touch funnels stay attributable. */
export function analyticsEndpoint(): string | null {
  const value = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  return value && value.length > 0 ? value : null;
}
