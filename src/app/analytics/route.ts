import { insertEvent } from "@/lib/analytics-store";
import {
  isAnalyticsEventName,
  sanitizeProperties,
} from "@/lib/analytics-events";
import { parseAttribution } from "@/lib/attribution";
import { callerKey, isSameOrigin } from "@/lib/request";

/**
 * POST /analytics
 *
 * Where the page reports what happened. Chosen over a third-party collector so
 * the numbers live in our own database and no visitor is handed to anyone else.
 *
 * Everything about this endpoint is defensive, because it is unauthenticated by
 * necessity: the page that calls it is public. It is bounded in size, refuses
 * any event name it does not recognise, allowlists property keys, and is rate
 * limited per caller. Nothing it does can affect the visitor, so a failure here
 * is always a silent 204 rather than an error surfaced to a browser.
 */

export const runtime = "nodejs";

/**
 * Deliberately tight. A real beacon is a few hundred bytes; anything larger is
 * either a bug or someone probing.
 */
const MAX_BODY_BYTES = 2048;

/** Generous enough for every event one page view can produce, many times over. */
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

/** Warned once per process: a misconfigured deploy should be loud, not spammy. */
let warnedUnconfigured = false;

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  porcessAnalyticsRate?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  globalForLimiter.porcessAnalyticsRate ?? new Map();
globalForLimiter.porcessAnalyticsRate = buckets;

/**
 * Counts one request against a caller's budget.
 *
 * In-memory and per-instance on purpose. A shared store would be more accurate
 * across instances, and would also mean shipping the visitor's address to
 * another system, which is a worse trade than occasionally allowing a burst
 * through one instance.
 */
function overRateLimit(key: string, now: number): boolean {
  const bucket = buckets.get(key);

  if (bucket === undefined || now >= bucket.resetAt) {
    // Opportunistic sweep, so the map cannot grow without bound.
    if (buckets.size > 5_000) {
      for (const [oldKey, oldBucket] of buckets) {
        if (now >= oldBucket.resetAt) {
          buckets.delete(oldKey);
        }
      }
    }

    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

/** Always 204: there is nothing a well-behaved caller would do with more. */
function accepted(): Response {
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function rejected(): Response {
  return new Response(null, {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return rejected();
  }

  if (overRateLimit(callerKey(request), Date.now())) {
    return accepted();
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return rejected();
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return rejected();
  }

  if (raw.length > MAX_BODY_BYTES) {
    return rejected();
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return rejected();
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return rejected();
  }

  if (!isAnalyticsEventName(payload.event)) {
    return rejected();
  }

  const visitor =
    typeof payload.visitor === "string" && payload.visitor.length > 0
      ? payload.visitor.slice(0, 64)
      : null;

  const path =
    typeof payload.path === "string" && payload.path.startsWith("/")
      ? payload.path.slice(0, 256)
      : "/";

  try {
    const result = await insertEvent({
      name: payload.event,
      path,
      visitor,
      properties: sanitizeProperties(payload.properties),
      attribution: parseAttribution(payload.attribution),
    });

    if (result.status === "unconfigured" && !warnedUnconfigured) {
      warnedUnconfigured = true;
      console.error(
        "[analytics] DATABASE_URL is not set, so events cannot be stored.",
      );
    }
  } catch (error) {
    // Analytics is never allowed to be the reason a page misbehaves, so this
    // is swallowed after being logged for whoever runs the deployment.
    console.error(
      "[analytics] store failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return accepted();
}

export function GET(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export function PUT(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export function DELETE(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
