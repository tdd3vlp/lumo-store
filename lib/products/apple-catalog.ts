// Apple App Store & iTunes gift cards via NS.gifts. Same shape as the Xbox
// lineup: a fixed set of NS.gifts services (one per region+denomination) with a
// wholesale USD cost, captured from the NS.gifts /stock catalog (probe,
// 2026-07 — categories "Apple | USA" id=4 and "Apple | TR" id=5). We price the
// USD cost through the global USD→RUB rate + the CARD markup (see getNsPricing),
// so the whole grid re-prices from one setting. Isomorphic — no server bits.
//
// Only US and TR are offered: NS.gifts also lists ~20 other Apple regions, but
// they carry single-digit stock, and the RU lineup is priced above its own face
// value (a ₽500 card costs $14+ wholesale), so it would only ever look broken.

export type AppleDenom = { amount: number; serviceId: number; costUsd: number };

export type AppleRegionSpec = {
  region: string;
  currency: string;
  label: string;
  /** Genitive form for "аккаунтами <…>". */
  gen: string;
  denoms: AppleDenom[];
};

export const APPLE_REGIONS: readonly AppleRegionSpec[] = [
  {
    region: "US",
    currency: "USD",
    label: "США",
    gen: "США",
    denoms: [
      { amount: 2, serviceId: 20, costUsd: 1.9261 },
      { amount: 3, serviceId: 21, costUsd: 2.8891 },
      { amount: 4, serviceId: 22, costUsd: 3.8522 },
      { amount: 5, serviceId: 23, costUsd: 4.8152 },
      { amount: 6, serviceId: 24, costUsd: 5.7782 },
      { amount: 7, serviceId: 25, costUsd: 6.7413 },
      { amount: 8, serviceId: 26, costUsd: 7.7043 },
      { amount: 9, serviceId: 27, costUsd: 8.6673 },
      { amount: 10, serviceId: 28, costUsd: 9.6303 },
      { amount: 20, serviceId: 29, costUsd: 19.2606 },
      { amount: 25, serviceId: 30, costUsd: 24.0758 },
      { amount: 50, serviceId: 31, costUsd: 48.1515 },
      { amount: 100, serviceId: 32, costUsd: 96.303 },
    ],
  },
  {
    region: "TR",
    currency: "TRY",
    label: "Турция",
    gen: "Турции",
    denoms: [
      { amount: 10, serviceId: 33, costUsd: 0.2357 },
      { amount: 25, serviceId: 34, costUsd: 0.584 },
      { amount: 50, serviceId: 35, costUsd: 1.0888 },
      { amount: 100, serviceId: 36, costUsd: 2.2066 },
      { amount: 250, serviceId: 37, costUsd: 5.5166 },
      { amount: 500, serviceId: 38, costUsd: 11.0331 },
      { amount: 1000, serviceId: 39, costUsd: 22.0662 },
      { amount: 1250, serviceId: 459, costUsd: 27.5828 },
      { amount: 1500, serviceId: 460, costUsd: 33.0993 },
      { amount: 1750, serviceId: 1841, costUsd: 38.4598 },
      { amount: 2000, serviceId: 1842, costUsd: 43.9511 },
    ],
  },
];

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", TRY: "₺" };

/** "$25", "250 ₺" — symbol leads for USD, trails for TRY. */
export function appleAmountLabel(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const n = amount.toLocaleString("ru-RU");
  return currency === "USD" ? `${sym}${n}` : `${n} ${sym}`;
}
