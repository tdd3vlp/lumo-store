"use client";

import { createContext, useContext } from "react";
import { DEFAULT_REGION_PRICING_RATES, getRegionRate } from "./rates";
import type { StoreRegion } from "@/store/useStore";

type RegionRates = Record<StoreRegion, number>;

const DEFAULT_RATES: RegionRates = {
  TR: getRegionRate("TR", DEFAULT_REGION_PRICING_RATES),
};

const RegionRatesContext = createContext<RegionRates>(DEFAULT_RATES);

export function RegionRatesProvider({
  children,
  rates,
}: {
  children: React.ReactNode;
  rates: RegionRates;
}) {
  return (
    <RegionRatesContext.Provider value={rates}>
      {children}
    </RegionRatesContext.Provider>
  );
}

export function useRegionRate(region: StoreRegion): number {
  return useContext(RegionRatesContext)[region];
}
