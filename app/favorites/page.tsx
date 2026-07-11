"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { formatRubles } from "@/lib/pricing/rates";
import { useStore } from "@/store/useStore";

type CatalogProduct = {
  denominationId: string;
  productType: string;
  displayName: string;
  image: string;
  region: string;
  currency: string;
  amountMajor: number;
  salePriceMinor: number | null;
  inStock: boolean;
};

export default function FavoritesPage() {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);

  useEffect(() => {
    if (favorites.length === 0) return;

    let active = true;
    fetch("/api/products/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { products?: CatalogProduct[] } | null) => {
        if (active && result && Array.isArray(result.products)) {
          setCatalog(result.products);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [favorites.length]);

  const favoriteProducts = useMemo(
    () => catalog.filter((product) => favorites.includes(product.denominationId)),
    [catalog, favorites],
  );

  return (
    <>
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Избранное</span>
        </nav>

        <h1 className="mb-6 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
          Избранное
        </h1>

        {favoriteProducts.length === 0 ? (
          <section className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-7 md:p-10">
            <h2 className="text-2xl font-bold text-[var(--ink)]">
              Здесь пока пусто
            </h2>
            <p className="mt-2 max-w-xl text-[var(--text-muted)]">
              Отмечай карты и пополнения сердечком, чтобы вернуться к ним позже.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)]"
            >
              В каталог
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.map((product) => {
              const isInCart = cart.some(
                (item) => item.denominationId === product.denominationId,
              );

              return (
                <article
                  key={product.denominationId}
                  className="flex flex-col overflow-hidden rounded-[18px] border border-[var(--line-strong)] bg-[var(--paper-strong)]"
                >
                  <div className="relative aspect-[7/8] overflow-hidden bg-[#d7d1c7]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 300px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="line-clamp-2 font-bold leading-snug text-[var(--ink)]">
                      {product.displayName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {product.amountMajor.toLocaleString("ru-RU")} {product.currency}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-lg font-extrabold text-[var(--ink)]">
                        {product.salePriceMinor != null
                          ? formatRubles(product.salePriceMinor)
                          : "Цена уточняется"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.denominationId)}
                        className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--line-strong)] text-[var(--coral)]"
                        aria-label="Удалить из избранного"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z" />
                        </svg>
                      </button>
                    </div>
                    {isInCart ? (
                      <Link
                        href="/cart"
                        className="mt-3 inline-flex items-center justify-center rounded-[12px] border border-[var(--line-strong)] px-4 py-2.5 text-sm font-extrabold text-[var(--ink)]"
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
                        className="mt-3 inline-flex items-center justify-center rounded-[12px] bg-[var(--signal)] px-4 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
                      >
                        В корзину
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
