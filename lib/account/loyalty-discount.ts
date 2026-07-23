// Pure, DB-free loyalty-discount math, shared by the checkout paths and tests.
//
// A tier carries two rates: one for gift cards / ready-made accounts ("card")
// and one for wallet top-ups ("topup"). The discount is applied at the unit
// price and rounded to whole minor units, so price × quantity stays exact and
// the charged total always reconciles with the payment provider's line items.

export type DiscountClass = "card" | "topup";

export type LoyaltyRates = {
  tierCode: string;
  /** Gift-card / account discount, in basis points (100 = 1%). */
  cardBps: number;
  /** Wallet top-up discount, in basis points. */
  topupBps: number;
};

/** Rates for a customer with no earned discount (base tier). */
export const NO_LOYALTY_DISCOUNT: LoyaltyRates = {
  tierCode: "base",
  cardBps: 0,
  topupBps: 0,
};

export function bpsForClass(rates: LoyaltyRates, cls: DiscountClass): number {
  return cls === "topup" ? rates.topupBps : rates.cardBps;
}

/**
 * Discounted unit price (minor units) after `bps` basis points off, rounded to
 * whole minor units. Clamped so a 0-bps line is untouched and a (hypothetical)
 * 100% line is free.
 */
export function discountedUnitMinor(unitMinor: number, bps: number): number {
  if (bps <= 0) return unitMinor;
  if (bps >= 10000) return 0;
  return Math.round((unitMinor * (10000 - bps)) / 10000);
}

/** The blended effective discount an order actually received, in basis points. */
export function effectiveBps(subtotalMinor: number, discountMinor: number): number {
  if (subtotalMinor <= 0) return 0;
  return Math.round((discountMinor / subtotalMinor) * 10000);
}
