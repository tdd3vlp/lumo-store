import "server-only";
import { APPLE_REGIONS } from "./apple-catalog";
import { computeNsPriceMinor, getNsPricing } from "./pricing";

export type AppleProduct = {
  denominationId: string;
  region: string;
  currency: string;
  amountMajor: number;
  priceMinor: number;
};

/**
 * Every App Store denomination priced in ruble minor units: USD cost × global
 * rate × (1 + card markup), one settings read for all of them. Handed to the
 * client block so region/amount selection needs no per-pick server call.
 */
export async function pricedAppleProducts(): Promise<AppleProduct[]> {
  const pricing = await getNsPricing();
  // Apple gift cards → priced with the CARD markup, not the top-up markup.
  const markup = { rate: pricing.rate, markupBps: pricing.markupBps };
  const out: AppleProduct[] = [];
  for (const r of APPLE_REGIONS) {
    for (const d of r.denoms) {
      out.push({
        denominationId: `apple-${r.region.toLowerCase()}-${d.amount}`,
        region: r.region,
        currency: r.currency,
        amountMajor: d.amount,
        priceMinor: computeNsPriceMinor(d.costUsd, markup),
      });
    }
  }
  return out;
}
