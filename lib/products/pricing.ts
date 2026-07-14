import "server-only";
import { sql } from "@/lib/db";

export type NsPricing = { rate: number; markupBps: number };

const DEFAULTS: NsPricing = { rate: 81, markupBps: 2500 };

/** Global USD->RUB rate + markup for NS.gifts-sourced products (app_settings). */
export async function getNsPricing(): Promise<NsPricing> {
  try {
    const rows = await sql`
      SELECT key, value FROM app_settings
      WHERE key IN ('ns_usd_rub_rate', 'ns_markup_bps')
    `;
    const map = new Map(rows.map((r) => [String(r.key), String(r.value)]));
    const rate = Number(map.get("ns_usd_rub_rate"));
    const markupBps = Number(map.get("ns_markup_bps"));
    return {
      rate: Number.isFinite(rate) && rate > 0 ? rate : DEFAULTS.rate,
      markupBps: Number.isFinite(markupBps) && markupBps >= 0 ? markupBps : DEFAULTS.markupBps,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Updates the global USD->RUB rate + markup; re-prices the NS.gifts catalog. */
export async function setNsPricing(rate: number, markupBps: number): Promise<void> {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("rate must be positive");
  if (!Number.isFinite(markupBps) || markupBps < 0) throw new Error("markup must be >= 0");
  await sql`
    INSERT INTO app_settings (key, value, updated_at) VALUES
      ('ns_usd_rub_rate', ${String(rate)}, now()),
      ('ns_markup_bps', ${String(Math.round(markupBps))}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

/**
 * Retail price in ruble minor units from a USD wholesale cost:
 * cost_usd × rate × (1 + markup), rounded to whole rubles.
 */
export function computeNsPriceMinor(
  costUsd: number,
  { rate, markupBps }: NsPricing,
): number {
  const rub = costUsd * rate * (1 + markupBps / 10000);
  return Math.round(rub) * 100;
}
