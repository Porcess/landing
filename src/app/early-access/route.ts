import { after } from "next/server";

import type { Attribution } from "@/lib/attribution";
import {
  insertSignup,
  targetDatabase,
  type SignupResult,
} from "@/lib/early-access/store";
import { LANDING_VERSION } from "@/lib/site";
import { clampField, checkEmail } from "@/lib/validation";

/**
 * POST /early-access
 *
 * The only server capability this site has. It validates an address, stores it
 * once, and optionally forwards it to a configured list provider after the
 * response has been sent. Nothing else is collected, and no email address is
 * ever written to a log line.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;

/** Warned once per process, so a misconfigured deploy is loud but not spammy. */
let warnedUnconfigured = false;

const EMPTY_ATTRIBUTION: Attribution = {
  referrer: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmTerm: null,
  utmContent: null,
};

type Status =
  | "subscribed"
  | "already_subscribed"
  | "invalid"
  | "too_large"
  | "rejected"
  | "unconfigured"
  | "error";

function respond(status: Status, httpStatus: number, extra?: object): Response {
  return Response.json(
    { status, ...extra },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function parseAttribution(input: unknown): Attribution {
  if (typeof input !== "object" || input === null) {
    return EMPTY_ATTRIBUTION;
  }

  const record = input as Record<string, unknown>;

  return {
    referrer: clampField(record.referrer),
    utmSource: clampField(record.utmSource, 256),
    utmMedium: clampField(record.utmMedium, 256),
    utmCampaign: clampField(record.utmCampaign, 256),
    utmContent: clampField(record.utmContent, 256),
    utmTerm: clampField(record.utmTerm, 256),
  };
}

/**
 * A form post from this site never carries a foreign origin, so a present
 * origin that disagrees with the request host is rejected.
 */
function isSameOrigin(request: Request): boolean {
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

/** Hostnames that always mean this machine. */
function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

type ForwardedSignup = {
  id: string;
  email: string;
  createdAt: string;
  landingPageVersion: string;
  attribution: Attribution;
};

/**
 * Scheduled after the response, so a slow or broken provider can never fail a
 * signup that is already committed to the database.
 */
function scheduleForward(payload: ForwardedSignup): void {
  const url = process.env.EARLY_ACCESS_WEBHOOK_URL;
  if (url === undefined || url.length === 0) {
    return;
  }

  const token = process.env.EARLY_ACCESS_WEBHOOK_TOKEN;

  after(async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token !== undefined && token.length > 0
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        console.error(
          `[early-access] forward rejected with ${response.status}`,
        );
      }
    } catch (error) {
      console.error(
        "[early-access] forward failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return respond("rejected", 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return respond("too_large", 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return respond("too_large", 413);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return respond("invalid", 400, { problem: "empty" });
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return respond("invalid", 400, { problem: "empty" });
  }

  // A filled honeypot is a bot. Answer as if it worked and store nothing.
  if (typeof payload.honeypot === "string" && payload.honeypot.length > 0) {
    console.info("[early-access] discarded a honeypot submission");
    return respond("subscribed", 200);
  }

  const check = checkEmail(payload.email);
  if (!check.ok) {
    return respond("invalid", 400, { problem: check.problem });
  }

  const attribution = parseAttribution(payload.attribution);

  let result: SignupResult;
  try {
    result = await insertSignup({
      email: check.email,
      emailNormalized: check.normalized,
      attribution,
    });
  } catch (error) {
    console.error(
      `[early-access] store failed against database "${targetDatabase()}":`,
      error instanceof Error ? error.message : "unknown error",
    );
    return respond("error", 500);
  }

  if (result.status === "unconfigured") {
    // Loud on purpose, once per process: an unconfigured signup path must never
    // look like a working one.
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.error(
        "[early-access] DATABASE_URL is not set, so signups cannot be stored.",
      );
    }
    return respond("unconfigured", 503);
  }

  if (result.status === "already_subscribed") {
    return respond("already_subscribed", 200);
  }

  // Identifier only. The address itself never reaches a log line.
  console.info(`[early-access] stored signup ${result.id}`);

  scheduleForward({
    id: result.id,
    email: check.email,
    createdAt: new Date().toISOString(),
    landingPageVersion: LANDING_VERSION,
    attribution,
  });

  return respond("subscribed", 200);
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
