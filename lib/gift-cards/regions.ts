import type { StoreRegion } from "@/store/useStore";
import { formatRubles as formatRublesMinor } from "@/lib/pricing/rates";

export type RegionConfig = {
  code: StoreRegion;
  name: string;
  currency: "TRY";
  currencySymbol: string;
  locale: string;
  denominations: number[];
};

export const REGION_CONFIG: Record<StoreRegion, RegionConfig> = {
  TR: {
    code: "TR",
    name: "Турция",
    currency: "TRY",
    currencySymbol: "₺",
    locale: "tr-TR",
    denominations: [250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  },
};

export function formatRegionalAmount(region: StoreRegion, value: number) {
  const config = REGION_CONFIG[region];
  return `${config.currencySymbol}${value.toLocaleString(config.locale)}`;
}

export function formatRubles(valueMinor: number | null) {
  if (valueMinor === null) return "Цена уточняется";

  return formatRublesMinor(valueMinor);
}
