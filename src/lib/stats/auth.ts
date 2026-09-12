/**
 * The lock on the stats page.
 *
 * A single password, exchanged for a signed cookie. The cookie carries its own
 * expiry and an HMAC over it, so verifying a session needs no database, no
 * session table, and no server-side state that a restart would forget. What it
 * costs is the ability to revoke one session without rotating the password,
 * which for a private dashboard read by one person is the right trade.
 *
 * The password itself is never compared in a way that leaks its length or
 * content through timing, and nothing about the attempt is logged: a log line
 * saying "wrong password" is a log line someone can read.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "porcess_stats";
export const SESSION_DAYS = 30;

/** Every stats route lives under here, and the cookie is scoped to it. */
export const STATS_PATH = "/a/n/stats";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const FAILURE_DELAY_MS = 1000;

/** The configured password, or null when the page is not available at all. */
export function statsPassword(): string | null {
  const value = process.env.STATS_PASSWORD;
  return value !== undefined && value.length > 0 ? value : null;
}

/**
 * True when the dashboard should pretend it does not exist.
 *
 * An unset password means an unconfigured deployment, and a stats page that
 * renders a login form on a deployment nobody protected is worse than one that
 * 404s: it announces that there is something here to guess at.
 */
export function statsDisabled(): boolean {
  return statsPassword() === null;
}

function key(password: string): Buffer {
  // Derived rather than used directly, so the HMAC key and the login password
  // are not the same bytes.
  return createHmac("sha256", "porcess-stats").update(password).digest();
}

function sign(expiry: number, password: string): string {
  return createHmac("sha256", key(password))
    .update(String(expiry))
    .digest("base64url");
}

/** Constant-time string compare that tolerates differing lengths. */
function equals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    // Still compare something of equal length, so the failure does not take a
    // different code path for a wrong length than for a wrong value.
    timingSafeEqual(a, a);
    return false;
  }

  return timingSafeEqual(a, b);
}

export function passwordMatches(candidate: string): boolean {
  const password = statsPassword();
  return password !== null && equals(candidate, password);
}

/** A token good until `expiresAt`, signed with the current password. */
export function issueSession(now: Date): { token: string; expiresAt: Date } {
  const password = statsPassword();
  if (password === null) {
    throw new Error("STATS_PASSWORD is not set");
  }

  const expiresAt = new Date(
    now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  const expiry = Math.floor(expiresAt.getTime() / 1000);

  return { token: `${String(expiry)}.${sign(expiry, password)}`, expiresAt };
}

/**
 * True when a token was issued by this deployment and has not expired.
 *
 * Rotating STATS_PASSWORD invalidates every existing cookie automatically,
 * because the signature no longer verifies: changing the password is also
 * signing everyone out.
 */
export function sessionValid(token: string | undefined, now: Date): boolean {
  const password = statsPassword();
  if (password === null || token === undefined) {
    return false;
  }

  const separator = token.indexOf(".");
  if (separator <= 0) {
    return false;
  }

  const expiryPart = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiry = Number(expiryPart);
  if (!Number.isFinite(expiry) || expiry * 1000 <= now.getTime()) {
    return false;
  }

  return equals(signature, sign(expiry, password));
}

export function readSessionCookie(
  cookieHeader: string | null,
): string | undefined {
  if (cookieHeader === null) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return rest.join("=");
    }
  }

  return undefined;
}

export function isAuthorised(
  request: Request,
  now: Date = new Date(),
): boolean {
  return sessionValid(readSessionCookie(request.headers.get("cookie")), now);
}

/** The cookie attributes for a new session, scoped and httpOnly. */
export function sessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    `Path=${STATS_PATH}`,
    `Expires=${expiresAt.toUTCString()}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

/** The cookie that clears a session. */
export function clearedCookie(secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=`,
    `Path=${STATS_PATH}`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

type Attempts = { count: number; resetAt: number };

const globalForAttempts = globalThis as unknown as {
  porcessStatsAttempts?: Map<string, Attempts>;
};

const attempts: Map<string, Attempts> =
  globalForAttempts.porcessStatsAttempts ?? new Map();
globalForAttempts.porcessStatsAttempts = attempts;

/**
 * Whether this caller has spent its attempts for the hour.
 *
 * Per-process and in-memory, like the event limiter, for the same reason: a
 * shared store means shipping a visitor address somewhere else. It bounds a
 * password guesser to five tries an hour per instance, which together with the
 * delay below is enough for a private page.
 */
export function attemptBlocked(key: string, now: Date): boolean {
  const record = attempts.get(key);
  if (record === undefined || now.getTime() >= record.resetAt) {
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string, now: Date): void {
  const record = attempts.get(key);

  if (record === undefined || now.getTime() >= record.resetAt) {
    attempts.set(key, {
      count: 1,
      resetAt: now.getTime() + ATTEMPT_WINDOW_MS,
    });
    return;
  }

  record.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** A short pause on a wrong password, so guessing is slow even under the limit. */
export function failureDelay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, FAILURE_DELAY_MS);
  });
}

/** For tests, which need a clean slate between cases. */
export function resetAttempts(): void {
  attempts.clear();
}
