export type RegionPricingRate = {
  region: string;
  currency: string;
  rubMinorPerUnit: number;
  updatedAt: string;
};

/**
 * Default rates used as a fallback when the database is unavailable.
 * Mirrors the seed in db/migrations/005_regional_pricing_rates.sql.
 */
export const DEFAULT_REGION_PRICING_RATES: ReadonlyArray<
  Pick<RegionPricingRate, "region" | "currency" | "rubMinorPerUnit">
> = [
  { region: "IN", currency: "INR", rubMinorPerUnit: 125 },
  { region: "TR", currency: "TRY", rubMinorPerUnit: 225 },
];

/**
 * Converts an amount in a region's major currency units into rubles, expressed
 * in minor units (kopecks). Stays in integer arithmetic to avoid float drift.
 *
 * calculateRubMinor(1000, 125) === 125000  // 1000 INR -> 1250 ₽
 * calculateRubMinor(1000, 225) === 225000  // 1000 TRY -> 2250 ₽
 */
export function calculateRubMinor(
  amountMajor: number,
  rubMinorPerUnit: number,
): number {
  if (!Number.isInteger(amountMajor) || amountMajor < 0) {
    throw new Error("amountMajor must be a non-negative integer");
  }
  if (!Number.isInteger(rubMinorPerUnit) || rubMinorPerUnit <= 0) {
    throw new Error("rubMinorPerUnit must be a positive integer");
  }
  return amountMajor * rubMinorPerUnit;
}

/**
 * Parses a human-entered ruble rate ("1.25", "2,25", "3") into integer kopecks
 * per currency unit. Uses string parsing instead of `Number(value) * 100` so we
 * never hit float rounding (e.g. 0.07 * 100 === 7.000000000000001).
 *
 * parseRubRateToMinorPerUnit("1.25") === 125
 * parseRubRateToMinorPerUnit("2,25") === 225
 */
export function parseRubRateToMinorPerUnit(value: string): number {
  if (typeof value !== "string") {
    throw new Error("Rate must be a string");
  }

  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Rate must be a number with up to two decimal places");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(2, "0");
  const minor = Number(whole) * 100 + Number(paddedFraction);

  if (!Number.isInteger(minor) || minor <= 0) {
    throw new Error("Rate must be greater than zero");
  }

  return minor;
}

/**
 * Renders integer kopecks-per-unit as a plain ruble rate string ("125" -> "1.25").
 */
export function formatRubRate(rubMinorPerUnit: number): string {
  if (!Number.isInteger(rubMinorPerUnit) || rubMinorPerUnit <= 0) {
    throw new Error("rubMinorPerUnit must be a positive integer");
  }
  const whole = Math.floor(rubMinorPerUnit / 100);
  const fraction = rubMinorPerUnit % 100;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

/**
 * Formats a ruble amount given in minor units (kopecks) for display.
 */
export function formatRubles(valueMinor: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

const REGIONAL_CURRENCY_FORMAT: Record<
  string,
  { symbol: string; locale: string }
> = {
  INR: { symbol: "₹", locale: "en-IN" },
  TRY: { symbol: "₺", locale: "tr-TR" },
};

/**
 * Formats a regional (foreign-currency) price in major units for display,
 * e.g. formatRegionalPrice(1000, "INR") === "₹1,000".
 * For ruble sale prices use formatRubles (which works in minor units / kopecks).
 */
export function formatRegionalPrice(
  amountMajor: number,
  currency: string,
): string {
  const config = REGIONAL_CURRENCY_FORMAT[currency] ?? {
    symbol: "",
    locale: "ru-RU",
  };
  return `${config.symbol}${amountMajor.toLocaleString(config.locale)}`;
}

// Database-backed accessors live in ./rates.server.ts so this module stays
// client-safe (importing postgres into a client bundle breaks the build).
