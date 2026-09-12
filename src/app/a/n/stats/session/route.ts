import { isSecureRequest, callerKey } from "@/lib/request";
import {
  attemptBlocked,
  clearedCookie,
  clearFailures,
  failureDelay,
  issueSession,
  passwordMatches,
  recordFailure,
  sessionCookie,
  STATS_PATH,
  statsDisabled,
} from "@/lib/stats/auth";

/**
 * POST /a/n/stats/session
 *
 * The only way in. A plain form post, so it works with no scripting at all, and
 * a redirect rather than a rendered response, so a refresh cannot resubmit a
 * password.
 *
 * Wrong password, unknown caller, blocked caller and a missing password all end
 * the same way: back at the form, with nothing said about which it was.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(query: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${STATS_PATH}${query}`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (statsDisabled()) {
    return back("");
  }

  const secure = isSecureRequest(request);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back("?e=1");
  }

  if (form.get("intent") === "logout") {
    return new Response(null, {
      status: 303,
      headers: {
        Location: STATS_PATH,
        "Set-Cookie": clearedCookie(secure),
        "Cache-Control": "no-store",
      },
    });
  }

  const key = callerKey(request);
  const now = new Date();

  if (attemptBlocked(key, now)) {
    await failureDelay();
    return back("?e=1");
  }

  const candidate = form.get("password");
  if (typeof candidate !== "string" || !passwordMatches(candidate)) {
    recordFailure(key, now);
    await failureDelay();
    return back("?e=1");
  }

  clearFailures(key);
  const { token, expiresAt } = issueSession(now);

  return new Response(null, {
    status: 303,
    headers: {
      Location: STATS_PATH,
      "Set-Cookie": sessionCookie(token, expiresAt, secure),
      "Cache-Control": "no-store",
    },
  });
}
