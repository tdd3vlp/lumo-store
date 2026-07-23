import "server-only";
import { computeNsPriceMinor, getNsPricing } from "./pricing";
import { XBOX_REGIONS } from "./xbox-catalog";

export type XboxProduct = {
  denominationId: string;
  region: string;
  currency: string;
  amountMajor: number;
  priceMinor: number;
};

/**
 * Every Xbox denomination priced in ruble minor units: USD cost × global rate ×
 * (1 + card markup), one settings read for all of them. Handed to the client
 * block so region/amount selection needs no per-pick server call.
 */
export async function pricedXboxProducts(): Promise<XboxProduct[]> {
  const pricing = await getNsPricing();
  // Xbox gift cards → priced with the CARD markup, not the top-up markup.
  const markup = { rate: pricing.rate, markupBps: pricing.markupBps };
  const out: XboxProduct[] = [];
  for (const r of XBOX_REGIONS) {
    for (const d of r.denoms) {
      out.push({
        denominationId: `xbox-${r.region.toLowerCase()}-${d.amount}`,
        region: r.region,
        currency: r.currency,
        amountMajor: d.amount,
        priceMinor: computeNsPriceMinor(d.costUsd, markup),
      });
    }
  }
  return out;
}
