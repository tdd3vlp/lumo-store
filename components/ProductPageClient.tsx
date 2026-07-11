"use client";

import Image from "next/image";
import Link from "next/link";
import { formatRubles } from "@/lib/pricing/rates";
import { productTypeLabel } from "@/lib/products/labels";
import type { Product } from "@/lib/products/types";
import { useStore } from "@/store/useStore";

export default function ProductPageClient({ product }: { product: Product }) {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);

  const isFavorite = favorites.includes(product.denominationId);
  const inCart = cart.some((item) => item.denominationId === product.denominationId);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="relative aspect-[7/8] overflow-hidden rounded-[22px] border border-[var(--line-strong)] bg-[#d7d1c7]">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
            priority
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-unbounded)] text-2xl font-bold text-[var(--ink)]/40">
            {productTypeLabel(product.productType)}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <span className="inline-flex w-fit rounded-full bg-[var(--sky)] px-3 py-1 text-xs font-extrabold text-white">
          {productTypeLabel(product.productType)}
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          {product.displayName}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Номинал {product.amountMajor.toLocaleString("ru-RU")} {product.currency}
          {product.region && product.region !== "GLOBAL" ? ` · ${product.region}` : ""}
        </p>

        <div className="mt-6 rounded-[20px] bg-[var(--card-surface)] p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Цена
          </p>
          <p className="mt-1 font-[family-name:var(--font-unbounded)] text-4xl font-bold tracking-[-0.03em] text-[var(--ink)]">
            {product.salePriceMinor != null
              ? formatRubles(product.salePriceMinor)
              : "Цена уточняется"}
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {product.inStock
              ? "В наличии · доставка кода на почту после оплаты"
              : "Под заказ · выдаём после пополнения склада"}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {inCart ? (
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-[13px] border border-[var(--line-strong)] px-6 py-3.5 font-extrabold text-[var(--ink)]"
              >
                В корзине
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  addToCart({
                    denominationId: product.denominationId,
                    productType: product.productType,
                    title: product.displayName,
                    region: product.region,
                    currency: product.currency,
                    amountMajor: product.amountMajor,
                    priceMinor: product.salePriceMinor,
                    image: product.image,
                  })
                }
                className="inline-flex items-center justify-center rounded-[13px] bg-[var(--signal)] px-6 py-3.5 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
              >
                В корзину
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleFavorite(product.denominationId)}
              className={`inline-flex h-[52px] w-[52px] items-center justify-center rounded-[13px] border transition ${
                isFavorite
                  ? "border-[var(--coral)] text-[var(--coral)]"
                  : "border-[var(--line-strong)] text-[var(--text-muted)] hover:text-[var(--ink)]"
              }`}
              aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
              aria-pressed={isFavorite}
            >
              <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
