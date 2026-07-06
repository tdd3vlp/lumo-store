import {
  computeCardSaleMinor,
  DEFAULT_REGION_PRICING_RATES,
} from "@/lib/pricing/rates";
import { REGION_CONFIG } from "@/lib/gift-cards/regions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { sql } = await import("@/lib/db");

    const [rows, rateRows] = await Promise.all([
      sql`
        SELECT
          id,
          region,
          currency,
          amount_minor,
          sale_currency,
          sale_price_minor
        FROM gift_card_retail_prices
        WHERE active = true
        ORDER BY region, amount_minor
      `,
      sql`
        SELECT region, rub_minor_per_unit, card_coefficient_bps
        FROM regional_pricing_rates
      `,
    ]);

    const rateMap = new Map(
      rateRows.map((r) => [
        String(r.region),
        Number(r.card_coefficient_bps ?? 10000),
      ]),
    );

    return Response.json({
      denominations: rows.map((row) => {
        const nominalMajor = Number(row.amount_minor) / 100;
        let salePriceMinor =
          row.sale_price_minor === null ? null : Number(row.sale_price_minor);

        if (salePriceMinor === null) {
          const coeffBps = rateMap.get(String(row.region));
          if (coeffBps !== undefined) {
            salePriceMinor = computeCardSaleMinor(nominalMajor, coeffBps);
          }
        }

        return {
          id: String(row.id),
          region: String(row.region),
          currency: String(row.currency),
          amount: nominalMajor,
          saleCurrency: String(row.sale_currency),
          salePriceMinor,
        };
      }),
    });
  } catch {
    return Response.json({
      denominations: Object.values(REGION_CONFIG).flatMap((region) => {
        const defaults = DEFAULT_REGION_PRICING_RATES.find(
          (r) => r.region === region.code,
        );
        return region.denominations.map((amount) => ({
          id: `${region.code}-${amount}`,
          region: region.code,
          currency: region.currency,
          amount,
          saleCurrency: "RUB",
          salePriceMinor: defaults
            ? computeCardSaleMinor(amount, defaults.cardCoefficientBps)
            : null,
        }));
      }),
    });
  }
}
