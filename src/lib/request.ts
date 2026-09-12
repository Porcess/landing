/**
 * Request-shaped helpers shared by the two write endpoints.
 *
 * Server only: this imports `node:crypto`, so it must never reach a client
 * component.
 */

import { createHash, randomBytes } from "node:crypto";

/** Hostnames that always mean this machine. */
export function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

/**
 * A form post or a beacon from this site never carries a foreign origin, so a
 * present origin that disagrees with the request host is rejected.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.host === requestUrl.host) {
      return true;
    }
    // The production server can canonicalize its own hostname (notably
    // `localhost` when the page was reached over `127.0.0.1`), so loopback
    // forms of the same machine and port compare as the same origin rather
    // than as a forgery.
    return (
      originUrl.protocol === requestUrl.protocol &&
      originUrl.port === requestUrl.port &&
      isLoopback(originUrl.hostname) &&
      isLoopback(requestUrl.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * True when the request reached this server over TLS, including through the
 * reverse proxy that terminates it in production.
 *
 * A `Secure` cookie is dropped by the browser when the response arrives over
 * plain HTTP, so a local run on `http://127.0.0.1` would appear to reject every
 * correct password. This is what decides the flag instead of the environment.
 */
export function isSecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded !== null) {
    return forwarded.split(",")[0]?.trim() === "https";
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/** The visitor's address as reported by a proxy, or null when it is absent. */
export function clientAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();
    if (first !== undefined && first.length > 0) {
      return first;
    }
  }

  const real = request.headers.get("x-real-ip");
  return real !== null && real.length > 0 ? real : null;
}

/**
 * A stable, non-reversible key for one caller, used to bound request rate.
 *
 * The address is hashed with a per-process salt and never stored, logged, or
 * written to a row. The salt dies with the process, so the keys cannot be
 * correlated across restarts, and they exist only to answer "is this the same
 * caller as a moment ago" inside a single process lifetime.
 */
const salt = randomBytes(16);

export function callerKey(request: Request): string {
  const address = clientAddress(request);
  if (address === null) {
    return "unknown";
  }

  return createHash("sha256")
    .update(salt)
    .update(address)
    .digest("base64url")
    .slice(0, 22);
}
