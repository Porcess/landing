/**
 * Reading and writing the one active offer.
 *
 * The offer lives in a database singleton so it can be changed from the private
 * dashboard without a deploy, and so every signup can snapshot the value that was
 * live when the visitor joined. Every read is total: a missing database, a
 * missing row, or a failed query returns `DEFAULT_OFFER` rather than throwing,
 * because the public landing page must keep rendering when the database is down.
 *
 * The write path is the opposite: it is explicit about failure, because an edit
 * that silently did nothing is worse than one that reports it.
 */

import { databaseConfigured, query } from "@/lib/db";

import {
  DEFAULT_OFFER,
  MAX_BASE_PRICE_CENTS,
  MAX_PERCENT,
  MIN_BASE_PRICE_CENTS,
  MIN_PERCENT,
  type Offer,
} from "./format";

type OfferRow = { percent: number; basePriceCents: number };

/** The active offer, or the default when it cannot be read. */
export async function getActiveOffer(): Promise<Offer> {
  if (!databaseConfigured()) {
    return DEFAULT_OFFER;
  }

  try {
    const rows = await query<OfferRow>(
      `select percent, base_price_cents as "basePriceCents"
       from offer_settings
       where id = true`,
    );

    const row = rows[0];
    if (row === undefined) {
      return DEFAULT_OFFER;
    }

    return { percent: row.percent, basePriceCents: row.basePriceCents };
  } catch {
    // Unreadable is not the same as absent, but both must render something. The
    // public page cannot show an error, so it falls back to the launch offer.
    return DEFAULT_OFFER;
  }
}

export type OfferWriteResult =
  | { ok: true; previous: Offer | null; current: Offer }
  | { ok: false; reason: "invalid" | "unconfigured" | "failed" };

/**
 * Validates raw form values, strictly.
 *
 * Strict rather than lenient on purpose: `parseInt("9.5")` silently accepts a
 * value the operator did not mean, and a digits-only pattern is the simplest way
 * to refuse a decimal, a sign, an exponent, or a stray label.
 */
export function parseOfferInput(
  percent: unknown,
  basePriceCents: unknown,
): { ok: true; offer: Offer } | { ok: false } {
  if (typeof percent !== "string" || !/^\d{1,2}$/.test(percent.trim())) {
    return { ok: false };
  }
  if (
    typeof basePriceCents !== "string" ||
    !/^\d{1,6}$/.test(basePriceCents.trim())
  ) {
    return { ok: false };
  }

  const parsedPercent = Number.parseInt(percent.trim(), 10);
  const parsedBase = Number.parseInt(basePriceCents.trim(), 10);

  if (parsedPercent < MIN_PERCENT || parsedPercent > MAX_PERCENT) {
    return { ok: false };
  }
  if (parsedBase < MIN_BASE_PRICE_CENTS || parsedBase > MAX_BASE_PRICE_CENTS) {
    return { ok: false };
  }

  return {
    ok: true,
    offer: { percent: parsedPercent, basePriceCents: parsedBase },
  };
}

/**
 * Writes the active offer and records what it replaced, in one statement.
 *
 * A single statement does two jobs that must not be separable: the settings row
 * is upserted and the history row is written from the same `previous` snapshot.
 * Two round trips would leave a window where a change happened but was not
 * recorded, or was recorded twice.
 */
export async function setActiveOffer(offer: Offer): Promise<OfferWriteResult> {
  if (!databaseConfigured()) {
    return { ok: false, reason: "unconfigured" };
  }

  try {
    const rows = await query<{
      previousPercent: number | null;
      previousBasePriceCents: number | null;
    }>(
      `with previous as (
         select percent, base_price_cents from offer_settings where id = true
       ), upserted as (
         insert into offer_settings (id, percent, base_price_cents, updated_at)
         values (true, $1, $2, now())
         on conflict (id) do update
           set percent = excluded.percent,
               base_price_cents = excluded.base_price_cents,
               updated_at = now()
         returning percent, base_price_cents
       ), recorded as (
         insert into offer_history (
           percent,
           base_price_cents,
           previous_percent,
           previous_base_price_cents
         )
         select upserted.percent,
                upserted.base_price_cents,
                previous.percent,
                previous.base_price_cents
         from upserted
         left join previous on true
         returning 1
       )
       select
         (select percent from previous) as "previousPercent",
         (select base_price_cents from previous) as "previousBasePriceCents"`,
      [offer.percent, offer.basePriceCents],
    );

    const row = rows[0];
    const previous =
      row === undefined ||
      row.previousPercent === null ||
      row.previousBasePriceCents === null
        ? null
        : {
            percent: row.previousPercent,
            basePriceCents: row.previousBasePriceCents,
          };

    return { ok: true, previous, current: offer };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
