import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";

import { parseOfferInput, setActiveOffer } from "@/lib/offer/settings";
import { isSameOrigin } from "@/lib/request";
import { isAuthorised, STATS_PATH, statsDisabled } from "@/lib/stats/auth";

/**
 * POST /a/n/stats/offer
 *
 * Changes the one active offer. Behind the same lock as the rest of the
 * dashboard: no valid session means this does not exist, and a cross-origin post
 * is refused rather than trusted.
 *
 * A plain form post and a redirect, like the login, so the operator does not need
 * JavaScript to run the pricing. Every outcome is reported in the URL rather
 * than rendered here, so a refresh cannot resubmit the change.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(query: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${STATS_PATH}${query}#offer`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (statsDisabled()) {
    notFound();
  }

  if (!isAuthorised(request)) {
    return new Response("Not found", { status: 404 });
  }

  if (!isSameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  if (form === null) {
    return back("?offer=invalid");
  }

  const parsed = parseOfferInput(
    form.get("percent"),
    form.get("basePriceCents"),
  );
  if (!parsed.ok) {
    return back("?offer=invalid");
  }

  const result = await setActiveOffer(parsed.offer);
  if (!result.ok) {
    return back(
      result.reason === "unconfigured"
        ? "?offer=unconfigured"
        : "?offer=failed",
    );
  }

  // The public page reads the offer on every request, so this is insurance
  // rather than the mechanism: if the page is ever cached, the change still
  // lands immediately.
  revalidatePath("/");

  return back("?offer=saved");
}

export function GET(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
