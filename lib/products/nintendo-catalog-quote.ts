import "server-only";
import { NINTENDO_REGIONS } from "./nintendo-catalog";
import { computeNsPriceMinor, getNsPricing } from "./pricing";

export type NintendoProduct = {
  denominationId: string;
  region: string;
  currency: string;
  amountMajor: number;
  priceMinor: number;
};

/**
 * Every Nintendo eShop denomination priced in ruble minor units: USD cost ×
 * global rate × (1 + card markup), one settings read for all of them. Handed to
 * the client block so region/amount selection needs no per-pick server call.
 */
export async function pricedNintendoProducts(): Promise<NintendoProduct[]> {
  const pricing = await getNsPricing();
  // Nintendo gift cards → priced with the CARD markup, not the top-up markup.
  const markup = { rate: pricing.rate, markupBps: pricing.markupBps };
  const out: NintendoProduct[] = [];
  for (const r of NINTENDO_REGIONS) {
    for (const d of r.denoms) {
      out.push({
        denominationId: `nintendo-${r.region.toLowerCase()}-${d.amount}`,
        region: r.region,
        currency: r.currency,
        amountMajor: d.amount,
        priceMinor: computeNsPriceMinor(d.costUsd, markup),
      });
    }
  }
  return out;
}
