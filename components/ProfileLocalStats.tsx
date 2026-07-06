"use client";

import Link from "next/link";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import { useStore } from "@/store/useStore";

export default function ProfileLocalStats() {
  const favorites = useStore((state) => state.favorites);
  const cart = useStore((state) => state.cart);
  const tryRate = useRegionRate("TR");

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Math.round(
    cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
  );

  return (
    <section className="rounded-[20px] bg-[var(--ink)] p-5 text-white">
      <p className="text-sm font-bold text-white/55">Твоя витрина</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/favorites"
          className="rounded-[15px] border border-white/14 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]"
        >
          <span className="block text-3xl font-bold text-[var(--signal)]">
            {favorites.length}
          </span>
          <span className="mt-1 block text-sm text-white/58">в избранном</span>
        </Link>
        <Link
          href="/cart"
          className="rounded-[15px] border border-white/14 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]"
        >
          <span className="block text-3xl font-bold text-[var(--signal)]">
            {cartCount}
          </span>
          <span className="mt-1 block text-sm text-white/58">в корзине</span>
        </Link>
      </div>
      <div className="mt-3 rounded-[15px] border border-white/14 bg-white/[0.055] p-4">
        <span className="block text-sm text-white/55">Сумма корзины</span>
        <span className="mt-1 block text-2xl font-bold text-white">
          {formatPriceAsRubles(cartTotal, tryRate)}
        </span>
      </div>
    </section>
  );
}
