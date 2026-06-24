import "server-only";
import { sql } from "@/lib/db";
import type { RegionPricingRate } from "@/lib/pricing/rates";

export async function getRegionalPricingRates(): Promise<RegionPricingRate[]> {
  const rows = await sql`
    SELECT region, currency, rub_minor_per_unit, updated_at
    FROM regional_pricing_rates
    ORDER BY region
  `;

  return rows.map((row) => ({
    region: String(row.region),
    currency: String(row.currency),
    rubMinorPerUnit: Number(row.rub_minor_per_unit),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function updateRegionalPricingRate(
  region: string,
  rubMinorPerUnit: number,
): Promise<RegionPricingRate> {
  if (!Number.isInteger(rubMinorPerUnit) || rubMinorPerUnit <= 0) {
    throw new Error("rubMinorPerUnit must be a positive integer");
  }

  const [row] = await sql`
    UPDATE regional_pricing_rates
    SET rub_minor_per_unit = ${rubMinorPerUnit}, updated_at = now()
    WHERE region = ${region}
    RETURNING region, currency, rub_minor_per_unit, updated_at
  `;

  if (!row) {
    throw new Error(`Unknown region: ${region}`);
  }

  return {
    region: String(row.region),
    currency: String(row.currency),
    rubMinorPerUnit: Number(row.rub_minor_per_unit),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
