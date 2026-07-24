import type { Product } from "./types";

// Dev-only placeholder catalog. NS.gifts only serves requests from the
// production server IP, so a local checkout syncs no inventory and the
// storefront blocks (PlayStation etc.) never render. These fabricated
// denominations let the UI be built locally. They are obviously NOT real
// inventory or real pricing — never rely on these numbers, and they are never
// returned in production (see getPublishedProducts).

type MockSpec = {
  type: string;
  region: string;
  currency: string;
  // Rough ruble-per-currency-unit, only so prices look plausible in dev.
  rubPerUnit: number;
  amounts: number[];
};

const SPECS: MockSpec[] = [
  // PlayStation — the block this mock primarily exists for: every allowed region.
  { type: "playstation", region: "US", currency: "USD", rubPerUnit: 95, amounts: [10, 25, 50, 100] },
  { type: "playstation", region: "TR", currency: "TRY", rubPerUnit: 2.6, amounts: [250, 500, 1000, 2000] },
  { type: "playstation", region: "IN", currency: "INR", rubPerUnit: 1.1, amounts: [500, 1000, 2000, 5000] },
  { type: "playstation", region: "PL", currency: "PLN", rubPerUnit: 24, amounts: [50, 100, 200, 350] },
  // A few other brands so the hero carousel still shows the full fan and the
  // catalog pages have something to render locally.
  // Xbox — mirrors the real NS.gifts denominations we sell (matches the cover
  // art in /public/covers): US 1/5/10/15/25/50/100 $, TR 25/50/100/300 ₺.
  { type: "xbox", region: "US", currency: "USD", rubPerUnit: 95, amounts: [1, 5, 10, 15, 25, 50, 100] },
  { type: "xbox", region: "TR", currency: "TRY", rubPerUnit: 2.6, amounts: [25, 50, 100, 300] },
  { type: "apple", region: "US", currency: "USD", rubPerUnit: 95, amounts: [10, 25, 50] },
  { type: "apple", region: "TR", currency: "TRY", rubPerUnit: 2.6, amounts: [250, 500, 1000] },
  { type: "nintendo", region: "US", currency: "USD", rubPerUnit: 95, amounts: [10, 20, 35] },
  { type: "steam", region: "US", currency: "USD", rubPerUnit: 95, amounts: [10, 25, 50] },
];

export function devMockProducts(): Product[] {
  return SPECS.flatMap((spec) =>
    spec.amounts.map((amount) => ({
      denominationId: `dev-${spec.type}-${spec.region}-${amount}`,
      productType: spec.type,
      displayName: `${spec.type} ${amount} ${spec.currency} (${spec.region}) · DEV`,
      image: "",
      region: spec.region,
      currency: spec.currency,
      amountMajor: amount,
      salePriceMinor: Math.round(amount * spec.rubPerUnit) * 100,
      inStock: true,
    })),
  );
}
