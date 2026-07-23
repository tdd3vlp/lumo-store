"use client";

import { useRouter } from "next/navigation";
import type { RegionPrice } from "@/lib/games/pricing";
import { useStore } from "@/store/useStore";

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  GBP: "£",
  TRY: "₺",
  INR: "₹",
  PLN: "zł",
};

/** "$50", "250 zł" — the symbol leads, except Polish. */
export function shortAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const n = amount.toLocaleString("ru-RU");
  return currency === "PLN" ? `${n} ${sym}` : `${sym}${n}`;
}

/**
 * Buying a game means buying the gift cards that cover its price — the region's
 * `cards` list, already worked out server-side. Shared by the home showcase and
 * the games catalog so both fill the cart identically.
 */
export function useGameCart() {
  const router = useRouter();
  const addToCart = useStore((state) => state.addToCart);

  return function buy(rp: RegionPrice, goToCart = true) {
    for (const c of rp.cards) {
      for (let i = 0; i < c.qty; i++) {
        addToCart({
          denominationId: c.denominationId,
          productType: "playstation",
          title: `PlayStation Store Card ${shortAmount(c.amountMajor, c.currency)} · ${c.currency} (${c.regionLabel})`,
          region: c.region,
          currency: c.currency,
          amountMajor: c.amountMajor,
          priceMinor: c.priceMinor,
          image: c.image,
        });
      }
    }
    if (goToCart) router.push("/cart");
  };
}
