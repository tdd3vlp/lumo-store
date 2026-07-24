// Telegram Stars top-up via NS.gifts (category "Telegram Stars", id 517). Pure,
// isomorphic helpers shared by the page, the /api/telegram/check-username route,
// and the checkout summary.
//
// Unlike Steam (one service with a continuous USD `amount`), Telegram Stars is
// sold as a fixed set of packages — each its own NS.gifts service_id with a
// wholesale USD cost. Values captured from the NS.gifts /stock catalog (probe,
// 2026-07). NS.gifts exposes NO exchange_rate for these services, so we price
// the USD cost through the same global USD→RUB rate + markup as the rest of the
// NS.gifts catalog. The order needs a single field, `account_number` — the
// recipient's public Telegram username.

export const TELEGRAM_STARS_CATEGORY_ID = 517;

export type StarDenomination = {
  stars: number;
  serviceId: number;
  costUsd: number;
};

// The only quantities NS.gifts stocks — a free-form amount can't be fulfilled.
export const STAR_DENOMINATIONS: readonly StarDenomination[] = [
  { stars: 50, serviceId: 2249, costUsd: 0.7995 },
  { stars: 100, serviceId: 2250, costUsd: 1.6149 },
  { stars: 150, serviceId: 2251, costUsd: 2.3985 },
  { stars: 250, serviceId: 2252, costUsd: 3.9974 },
  { stars: 500, serviceId: 2253, costUsd: 7.9947 },
  { stars: 1000, serviceId: 2254, costUsd: 15.9895 },
  { stars: 1500, serviceId: 2255, costUsd: 23.9844 },
  { stars: 2500, serviceId: 2256, costUsd: 39.9738 },
];

export function findDenomination(stars: number): StarDenomination | undefined {
  return STAR_DENOMINATIONS.find((d) => d.stars === stars);
}

// Telegram public username rule: 5–32 chars, latin letters/digits/underscore,
// starting with a letter. We accept an optional leading "@" and strip it.
export const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function normalizeTelegramUsername(input: string): string {
  return input.trim().replace(/^@+/, "");
}

export function isValidTelegramUsername(input: string): boolean {
  return TELEGRAM_USERNAME_REGEX.test(normalizeTelegramUsername(input));
}

export function formatStars(stars: number): string {
  return stars.toLocaleString("ru-RU");
}
