// Xbox gift cards via NS.gifts. Like Telegram Stars, the lineup is a fixed set
// of NS.gifts services (one per region+denomination) with a wholesale USD cost,
// captured from the NS.gifts /stock catalog (probe, 2026-07). We price the USD
// cost through the global USD→RUB rate + the CARD markup (see getNsPricing),
// so the whole grid re-prices from one setting. Isomorphic — no server bits.

export type XboxDenom = { amount: number; serviceId: number; costUsd: number };

export type XboxRegionSpec = {
  region: string;
  currency: string;
  label: string;
  /** Genitive form for "аккаунтами <…>". */
  gen: string;
  denoms: XboxDenom[];
};

export const XBOX_REGIONS: readonly XboxRegionSpec[] = [
  {
    region: "US",
    currency: "USD",
    label: "США",
    gen: "США",
    denoms: [
      { amount: 1, serviceId: 122, costUsd: 1.0245 },
      { amount: 5, serviceId: 123, costUsd: 4.9791 },
      { amount: 10, serviceId: 124, costUsd: 9.1181 },
      { amount: 15, serviceId: 125, costUsd: 13.6771 },
      { amount: 25, serviceId: 126, costUsd: 22.7952 },
      { amount: 50, serviceId: 127, costUsd: 45.5903 },
      { amount: 100, serviceId: 128, costUsd: 91.1805 },
    ],
  },
  {
    region: "TR",
    currency: "TRY",
    label: "Турция",
    gen: "Турции",
    denoms: [
      { amount: 25, serviceId: 85, costUsd: 0.5461 },
      { amount: 50, serviceId: 86, costUsd: 1.0921 },
      { amount: 100, serviceId: 87, costUsd: 2.1842 },
      { amount: 300, serviceId: 88, costUsd: 6.5523 },
    ],
  },
  {
    region: "EU",
    currency: "EUR",
    label: "Европа",
    gen: "Европы",
    denoms: [
      { amount: 5, serviceId: 2425, costUsd: 5.5323 },
      { amount: 10, serviceId: 2426, costUsd: 11.0646 },
      { amount: 15, serviceId: 2427, costUsd: 16.5867 },
      { amount: 20, serviceId: 2428, costUsd: 22.119 },
      { amount: 25, serviceId: 2429, costUsd: 27.6513 },
      { amount: 30, serviceId: 2430, costUsd: 33.1836 },
      { amount: 50, serviceId: 2431, costUsd: 55.3026 },
      { amount: 75, serviceId: 2432, costUsd: 82.9538 },
      { amount: 100, serviceId: 2433, costUsd: 110.6051 },
    ],
  },
  {
    region: "ZA",
    currency: "ZAR",
    label: "ЮАР",
    gen: "ЮАР",
    denoms: [
      { amount: 50, serviceId: 89, costUsd: 2.8174 },
      { amount: 100, serviceId: 90, costUsd: 5.6348 },
      { amount: 120, serviceId: 91, costUsd: 6.7617 },
      { amount: 150, serviceId: 92, costUsd: 8.4522 },
      { amount: 200, serviceId: 93, costUsd: 11.2695 },
      { amount: 250, serviceId: 94, costUsd: 14.0869 },
      { amount: 300, serviceId: 95, costUsd: 16.9043 },
      { amount: 350, serviceId: 96, costUsd: 19.7217 },
      { amount: 450, serviceId: 97, costUsd: 25.3564 },
      { amount: 500, serviceId: 98, costUsd: 28.1738 },
      { amount: 550, serviceId: 99, costUsd: 30.9912 },
      { amount: 600, serviceId: 100, costUsd: 33.8085 },
    ],
  },
];

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", TRY: "₺", ZAR: "R" };

/** "$25", "€10", "25 ₺", "250 R" — symbol leads for USD/EUR, trails for TRY/ZAR. */
export function xboxAmountLabel(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const n = amount.toLocaleString("ru-RU");
  return currency === "USD" || currency === "EUR" ? `${sym}${n}` : `${n} ${sym}`;
}
