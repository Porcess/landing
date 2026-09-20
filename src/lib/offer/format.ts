/**
 * The offer, as pure functions.
 *
 * An offer is a discount percent and an undiscounted base price. The displayed
 * price is always derived, never stored: storing it would let a price and the
 * discount that produced it drift apart, and the two are shown side by side.
 *
 * These are kept separate from the database read so the arithmetic that a visitor
 * actually sees is testable on its own, without a database.
 */

export type Offer = {
  /** Discount percent, 0 to 99. */
  percent: number;
  /** Undiscounted price, in whole cents. */
  basePriceCents: number;
};

/** The offer shown when no database is configured or reachable. */
export const DEFAULT_OFFER: Offer = { percent: 90, basePriceCents: 2000 };

export const MIN_PERCENT = 0;
export const MAX_PERCENT = 99;
export const MIN_BASE_PRICE_CENTS = 100;
export const MAX_BASE_PRICE_CENTS = 999_999;

/**
 * The discounted price in whole cents, rounded to the nearest cent.
 *
 * `Math.round` rather than a floor: the price a visitor is quoted should be the
 * nearest honest cent to the discount, not one that quietly drifts upward in
 * Porcess's favour on every fraction.
 */
export function offerPriceCents(offer: Offer): number {
  return Math.round((offer.basePriceCents * (100 - offer.percent)) / 100);
}

/** `$20` when the amount is whole dollars, `$13.40` when it is not. */
export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${String(dollars)}`
    : `$${dollars.toFixed(2)}`;
}

/** `90% off`, the only shape the discount is ever written in. */
export function discountLabel(percent: number): string {
  return `${String(percent)}% off`;
}

/** True when the offer actually reduces the price. */
export function hasDiscount(offer: Offer): boolean {
  return offer.percent > 0;
}
