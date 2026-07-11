import "server-only";
import { sql } from "@/lib/db";
import { computeCardSaleMinor } from "@/lib/pricing/rates";
import type { Product } from "./types";

/**
 * Published, in-catalog products: gift-card denominations flagged
 * is_published + active, joined to their resolved retail price and available
 * inventory count. Pricing prefers the gift_card_retail_prices view (which
 * honours an explicit override / procurement cost + policy markup) and falls
 * back to the region's card coefficient — the same resolution order the legacy
 * gift-card catalog used.
 */
export async function getPublishedProducts(): Promise<Product[]> {
  const [rows, rateRows] = await Promise.all([
    sql`
      SELECT
        d.id,
        d.product_type,
        d.region,
        d.currency,
        d.amount_minor,
        d.display_name,
        d.image_url,
        retail.sale_price_minor,
        COUNT(cards.id) FILTER (WHERE cards.status = 'available') AS available_count
      FROM gift_card_denominations d
      LEFT JOIN gift_card_retail_prices retail ON retail.id = d.id
      LEFT JOIN gift_card_inventory cards ON cards.denomination_id = d.id
      WHERE d.is_published = true AND d.active = true
      GROUP BY
        d.id, d.product_type, d.region, d.currency, d.amount_minor,
        d.display_name, d.image_url, retail.sale_price_minor
      ORDER BY d.product_type, d.amount_minor
    `,
    sql`SELECT region, card_coefficient_bps FROM regional_pricing_rates`,
  ]);

  const rateMap = new Map(
    rateRows.map((r) => [String(r.region), Number(r.card_coefficient_bps ?? 10000)]),
  );

  return rows.map((row) => {
    const amountMajor = Number(row.amount_minor) / 100;
    let salePriceMinor =
      row.sale_price_minor === null ? null : Number(row.sale_price_minor);
    if (salePriceMinor === null) {
      const coeff = rateMap.get(String(row.region));
      if (coeff !== undefined) {
        salePriceMinor = computeCardSaleMinor(amountMajor, coeff);
      }
    }

    return {
      denominationId: String(row.id),
      productType: String(row.product_type),
      displayName:
        row.display_name === null
          ? `${row.product_type} ${amountMajor}`
          : String(row.display_name),
      image: row.image_url === null ? "" : String(row.image_url),
      region: String(row.region),
      currency: String(row.currency),
      amountMajor,
      salePriceMinor,
      inStock: Number(row.available_count) > 0,
    };
  });
}
