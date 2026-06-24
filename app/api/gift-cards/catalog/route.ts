import { REGION_CONFIG } from "@/lib/gift-cards/regions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { sql } = await import("@/lib/db");
    const rows = await sql`
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
    `;

    return Response.json({
      denominations: rows.map((row) => ({
        id: String(row.id),
        region: String(row.region),
        currency: String(row.currency),
        amount: Number(row.amount_minor) / 100,
        saleCurrency: String(row.sale_currency),
        salePriceMinor:
          row.sale_price_minor === null ? null : Number(row.sale_price_minor),
      })),
    });
  } catch {
    return Response.json({
      denominations: Object.values(REGION_CONFIG).flatMap((region) =>
        region.denominations.map((amount) => ({
          id: `${region.code}-${amount}`,
          region: region.code,
          currency: region.currency,
          amount,
          saleCurrency: "RUB",
          salePriceMinor: null,
        })),
      ),
    });
  }
}
