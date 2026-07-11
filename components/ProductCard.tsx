"use client";

import Image from "next/image";
import Link from "next/link";
import { formatRubles } from "@/lib/pricing/rates";
import { productTypeLabel } from "@/lib/products/labels";
import type { Product } from "@/lib/products/types";
import { useStore } from "@/store/useStore";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.5 8.5h11l-1 10.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6.5 8.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 9V7.5a3 3 0 0 1 6 0V9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);

  const isFavorite = favorites.includes(product.denominationId);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-strong)] transition hover:-translate-y-0.5">
      <Link
        href={`/product/${product.denominationId}`}
        className="relative block aspect-[7/8] overflow-hidden bg-[#d7d1c7]"
        aria-label={product.displayName}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-unbounded)] text-lg font-bold text-[var(--ink)]/40">
            {productTypeLabel(product.productType)}
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-[var(--sky)] px-2.5 py-1 text-[11px] font-extrabold text-white">
          {productTypeLabel(product.productType)}
        </span>
        {!product.inStock && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[11px] font-extrabold text-white/80">
            Под заказ
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(product.denominationId)}
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border transition ${
          isFavorite
            ? "border-[var(--coral)] bg-white text-[var(--coral)]"
            : "border-white/40 bg-black/25 text-white hover:bg-black/40"
        } ${product.inStock ? "" : "top-12"}`}
        aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
        aria-pressed={isFavorite}
      >
        <HeartIcon filled={isFavorite} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/product/${product.denominationId}`}
          className="line-clamp-2 min-h-11 font-bold leading-snug text-[var(--ink)] hover:underline"
        >
          {product.displayName}
        </Link>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {product.amountMajor.toLocaleString("ru-RU")} {product.currency}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-unbounded)] text-lg font-bold tracking-[-0.03em] text-[var(--ink)]">
            {product.salePriceMinor != null
              ? formatRubles(product.salePriceMinor)
              : "Цена уточняется"}
          </span>
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
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
            aria-label={`Добавить ${product.displayName} в корзину`}
          >
            <CartIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
