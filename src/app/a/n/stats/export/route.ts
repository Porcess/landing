import { notFound } from "next/navigation";

import { formatUtc } from "@/lib/stats/format";
import { isAuthorised, statsDisabled } from "@/lib/stats/auth";
import { recentSignups } from "@/lib/stats/queries";

/**
 * GET /a/n/stats/export
 *
 * The signup list as a file, because the list is the actual asset and reading
 * it out of a table cell by cell is not a workflow anyone should have to have.
 * Same lock as the dashboard: without a valid session this does not exist.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quotes a field, doubling any quote inside it, per RFC 4180. */
function cell(value: string | null): string {
  if (value === null) {
    return "";
  }

  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Prefixes a value that a spreadsheet would otherwise interpret as a formula.
 *
 * An address is attacker-influenced input, and a leading `=`, `+`, `-` or `@`
 * is how a CSV turns into code when someone opens it in Excel.
 */
function safe(value: string | null): string {
  if (value === null) {
    return "";
  }

  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export async function GET(request: Request): Promise<Response> {
  if (statsDisabled()) {
    notFound();
  }

  if (!isAuthorised(request)) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await recentSignups(10_000);

  const header = [
    "email",
    "created_at_utc",
    "referrer",
    "utm_source",
    "utm_campaign",
    "landing_page_version",
    "offer_percent",
    "base_price_cents",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        cell(safe(row.email)),
        cell(formatUtc(row.createdAt)),
        cell(safe(row.referrer)),
        cell(safe(row.utmSource)),
        cell(safe(row.utmCampaign)),
        cell(safe(row.landingPageVersion)),
        cell(String(row.offerPercent)),
        cell(String(row.basePriceCents)),
      ].join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`${lines.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="porcess-early-access-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
