import "server-only";
import { sql } from "@/lib/db";
import type { RegionPricingRate } from "@/lib/pricing/rates";

export async function getRegionalPricingRates(): Promise<RegionPricingRate[]> {
  const rows = await sql`
    SELECT region, currency, rub_minor_per_unit, card_coefficient_bps, updated_at
    FROM regional_pricing_rates
    ORDER BY region
  `;

  return rows.map((row) => ({
    region: String(row.region),
    currency: String(row.currency),
    rubMinorPerUnit: Number(row.rub_minor_per_unit),
    cardCoefficientBps: Number(row.card_coefficient_bps ?? 10000),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function updateRegionalPricingRate(
  region: string,
  rubMinorPerUnit: number,
  cardCoefficientBps?: number,
): Promise<RegionPricingRate> {
  if (!Number.isInteger(rubMinorPerUnit) || rubMinorPerUnit <= 0) {
    throw new Error("rubMinorPerUnit must be a positive integer");
  }

  const coeff = cardCoefficientBps ?? null;
  if (coeff !== null && (!Number.isInteger(coeff) || coeff <= 0)) {
    throw new Error("cardCoefficientBps must be a positive integer");
  }

  const [row] = coeff !== null
    ? await sql`
        UPDATE regional_pricing_rates
        SET rub_minor_per_unit = ${rubMinorPerUnit},
            card_coefficient_bps = ${coeff},
            updated_at = now()
        WHERE region = ${region}
        RETURNING region, currency, rub_minor_per_unit, card_coefficient_bps, updated_at
      `
    : await sql`
        UPDATE regional_pricing_rates
        SET rub_minor_per_unit = ${rubMinorPerUnit}, updated_at = now()
        WHERE region = ${region}
        RETURNING region, currency, rub_minor_per_unit, card_coefficient_bps, updated_at
      `;

  if (!row) {
    throw new Error(`Unknown region: ${region}`);
  }

  return {
    region: String(row.region),
    currency: String(row.currency),
    rubMinorPerUnit: Number(row.rub_minor_per_unit),
    cardCoefficientBps: Number(row.card_coefficient_bps ?? 10000),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
