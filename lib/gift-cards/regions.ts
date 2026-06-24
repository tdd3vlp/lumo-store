import type { StoreRegion } from "@/store/useStore";
import { formatRubles as formatRublesMinor } from "@/lib/pricing/rates";

export type RegionConfig = {
  code: StoreRegion;
  name: string;
  currency: "INR" | "TRY";
  currencySymbol: string;
  locale: string;
  denominations: number[];
};

export const REGION_CONFIG: Record<StoreRegion, RegionConfig> = {
  IN: {
    code: "IN",
    name: "Индия",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    denominations: [1000, 2000, 3000, 4000, 5000, 7000, 8000, 9000, 12000],
  },
  TR: {
    code: "TR",
    name: "Турция",
    currency: "TRY",
    currencySymbol: "₺",
    locale: "tr-TR",
    denominations: [],
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

