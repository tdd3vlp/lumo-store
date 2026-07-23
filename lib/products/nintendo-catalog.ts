// Nintendo eShop gift cards via NS.gifts. Same shape as the Xbox/Apple lineups:
// a fixed set of NS.gifts services (one per region+denomination) with a
// wholesale USD cost, captured from the NS.gifts /stock catalog (probe,
// 2026-07 — categories "Nintendo | USD" id=7, "Nintendo Gift Card | EU" id=51,
// "| UK" id=54 and "| PL" id=53). We price the USD cost through the global
// USD→RUB rate + the CARD markup (see getNsPricing), so the whole grid
// re-prices from one setting. Isomorphic — no server bits.
//
// Only US, EU, UK and PL are offered. NS.gifts also lists BR, HK and CA, but
// their stock runs 0–9 per denomination, and the whole JP lineup is out of
// stock — none of them would hold a shelf.

export type NintendoDenom = { amount: number; serviceId: number; costUsd: number };

export type NintendoRegionSpec = {
  region: string;
  currency: string;
  label: string;
  /** Genitive form for "аккаунтами <…>". */
  gen: string;
  denoms: NintendoDenom[];
};

export const NINTENDO_REGIONS: readonly NintendoRegionSpec[] = [
  {
    region: "US",
    currency: "USD",
    label: "США",
    gen: "США",
    denoms: [
      { amount: 5, serviceId: 71, costUsd: 4.7537 },
      { amount: 10, serviceId: 43, costUsd: 9.0156 },
      { amount: 20, serviceId: 44, costUsd: 18.0312 },
      { amount: 35, serviceId: 45, costUsd: 31.5546 },
      { amount: 50, serviceId: 46, costUsd: 45.078 },
      { amount: 70, serviceId: 2329, costUsd: 71.715 },
      { amount: 99, serviceId: 2330, costUsd: 94.3258 },
    ],
  },
  {
    region: "EU",
    currency: "EUR",
    label: "Европа",
    gen: "Европы",
    denoms: [
      { amount: 15, serviceId: 329, costUsd: 16.1974 },
      { amount: 25, serviceId: 330, costUsd: 26.9956 },
      { amount: 50, serviceId: 331, costUsd: 53.981 },
      { amount: 75, serviceId: 332, costUsd: 80.9765 },
      { amount: 100, serviceId: 333, costUsd: 107.9619 },
    ],
  },
  {
    region: "UK",
    currency: "GBP",
    label: "Великобритания",
    gen: "Великобритании",
    denoms: [
      { amount: 15, serviceId: 346, costUsd: 19.1582 },
      { amount: 25, serviceId: 347, costUsd: 31.9337 },
      { amount: 50, serviceId: 348, costUsd: 63.8776 },
      { amount: 75, serviceId: 349, costUsd: 95.8113 },
      { amount: 100, serviceId: 350, costUsd: 127.7552 },
    ],
  },
  {
    region: "PL",
    currency: "PLN",
    label: "Польша",
    gen: "Польши",
    denoms: [
      { amount: 70, serviceId: 341, costUsd: 18.021 },
      { amount: 120, serviceId: 342, costUsd: 30.8887 },
      { amount: 250, serviceId: 343, costUsd: 64.3591 },
      { amount: 370, serviceId: 344, costUsd: 95.2478 },
      { amount: 500, serviceId: 345, costUsd: 128.7182 },
    ],
  },
];

const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", PLN: "zł" };

/** "$35", "€25", "£50" — the symbol leads, except Polish "70 zł". */
export function nintendoAmountLabel(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const n = amount.toLocaleString("ru-RU");
  return currency === "PLN" ? `${n} ${sym}` : `${sym}${n}`;
}
