// Steam wallet top-up (NS.gifts service_id 1). Pure, isomorphic helpers shared
// by the home-page form, the /api/steam/check-login route, and the checkout
// summary so they all agree on currencies, bounds, conversion, and price.
//
// NS.gifts denominates the top-up in USD (`amount` field, 0.13–500, cost scales
// linearly at a 2% supplier discount). It also exposes:
//   - steam/check_user  → live "account exists" boolean (real validation)
//   - exchange_rate      → USD→{rub,uah,kzt} rates, so we can let the buyer top
//                          up in their wallet currency and price it correctly.

export const STEAM_TOPUP_SERVICE_ID = 1;

export type TopUpCurrency = "RUB" | "KZT" | "UAH" | "USD";

export const TOPUP_CURRENCIES: ReadonlyArray<{
  code: TopUpCurrency;
  symbol: string;
  label: string;
}> = [
  { code: "RUB", symbol: "₽", label: "₽ RUB" },
  { code: "KZT", symbol: "₸", label: "₸ KZT" },
  { code: "UAH", symbol: "₴", label: "₴ UAH" },
  { code: "USD", symbol: "$", label: "$ USD" },
];

export function isTopUpCurrency(value: string): value is TopUpCurrency {
  return value === "RUB" || value === "KZT" || value === "UAH" || value === "USD";
}

export function currencySymbol(currency: TopUpCurrency): string {
  return TOPUP_CURRENCIES.find((c) => c.code === currency)?.symbol ?? "₽";
}

/** `amount` + currency shown to the buyer, e.g. "100 ₽" or "10 $". */
export function formatTopUpAmount(amount: number, currency: TopUpCurrency): string {
  return `${amount.toLocaleString("ru-RU")} ${currencySymbol(currency)}`;
}

// NS.gifts `amount` field bounds, in USD.
export const MIN_USD = 0.13;
export const MAX_USD = 500;

// Our own business limits on a single payment, set in rubles and converted to
// the selected currency at the official rate: 50 ₽ – 15 000 ₽ per top-up.
export const MIN_TOPUP_RUB = 50;
export const MAX_TOPUP_RUB = 15_000;

// Per-Steam-account daily limits (rolling 24h), enforced at order creation:
// at most this many successful top-ups and this many USD in total.
export const MAX_TOPUPS_PER_ACCOUNT_PER_DAY = 3;
export const MAX_USD_PER_ACCOUNT_PER_DAY = 500;

/** USD→currency rates from NS.gifts exchange_rate (units of currency per 1 USD). */
export type FxRates = { rub: number; uah: number; kzt: number };

// Real Steam login rule (matches the NS.gifts create_order template and Steam
// itself): 3–32 chars of latin letters, digits, and underscore.
export const STEAM_LOGIN_REGEX = /^[a-zA-Z0-9_]{3,32}$/;

export function isValidSteamLogin(login: string): boolean {
  return STEAM_LOGIN_REGEX.test(login.trim());
}

/** Units of the given currency per 1 USD (USD is 1). */
export function currencyPerUsd(currency: TopUpCurrency, fx: FxRates): number {
  switch (currency) {
    case "USD":
      return 1;
    case "RUB":
      return fx.rub;
    case "KZT":
      return fx.kzt;
    case "UAH":
      return fx.uah;
  }
}

/** The wallet-add amount, expressed as the USD figure NS.gifts expects. */
export function amountToUsd(amount: number, currency: TopUpCurrency, fx: FxRates): number {
  const usd = amount / currencyPerUsd(currency, fx);
  return Math.round(usd * 100) / 100;
}

/**
 * Amount range the buyer may enter in the selected currency: the NS.gifts USD
 * bounds intersected with our 50–15 000 ₽ per-payment business limit (both
 * converted at the same official rate, so RUB gets exactly 50–15 000).
 */
export function topUpBounds(
  currency: TopUpCurrency,
  fx: FxRates,
): { min: number; max: number } {
  const per = currencyPerUsd(currency, fx);
  // Ratio first: for RUB per/fx.rub is exactly 1, so the bounds stay exactly
  // 50–15 000 with no floating-point drift.
  const perRub = per / fx.rub;
  const bizMin = Math.ceil(MIN_TOPUP_RUB * perRub);
  const bizMax = Math.floor(MAX_TOPUP_RUB * perRub);
  return {
    min: Math.max(1, Math.ceil(MIN_USD * per), bizMin),
    max: Math.min(Math.floor(MAX_USD * per), bizMax),
  };
}

export function isValidTopUpAmount(
  amount: number,
  currency: TopUpCurrency,
  fx: FxRates,
): boolean {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) return false;
  const { min, max } = topUpBounds(currency, fx);
  return amount >= min && amount <= max;
}

/**
 * Customer price in ruble minor units: the USD figure converted to rubles at
 * NS.gifts' own official USD→RUB rate, plus our markup, rounded to whole rubles.
 * With that single rate a ruble top-up reduces to amount × (1 + markup).
 */
export function priceMinorFromUsd(usd: number, rubPerUsd: number, markupBps: number): number {
  const rub = usd * rubPerUsd * (1 + markupBps / 10000);
  return Math.round(rub) * 100;
}
