"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useMemo } from "react";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import { REGION_CONFIG } from "@/lib/gift-cards/regions";
import { useStore } from "@/store/useStore";

type CartPreviewProps = {
  children: React.ReactNode;
  placement?: "below-right" | "above-right" | "left";
};

function getPlacementClass(placement: NonNullable<CartPreviewProps["placement"]>) {
  if (placement === "above-right") {
    return "bottom-full right-0 pb-3";
  }

  if (placement === "left") {
    return "right-full top-1/2 -translate-y-1/2 pr-3";
  }

  return "right-0 top-full pt-3";
}

export default function CartPreview({
  children,
  placement = "below-right",
}: CartPreviewProps) {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const selectedRegion = useStore((state) => state.selectedRegion);

  const regionRate = useRegionRate(selectedRegion);

  const regionCart = useMemo(
    () => cart.filter((item) => (item.region ?? "TR") === selectedRegion),
    [cart, selectedRegion],
  );

  const otherCount = useMemo(
    () =>
      cart
        .filter((item) => (item.region ?? "TR") !== selectedRegion)
        .reduce((sum, item) => sum + item.quantity, 0),
    [cart, selectedRegion],
  );

  const total = useMemo(
    () => regionCart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [regionCart],
  );

  function fmtPrice(price: number | null): string {
    if (price == null) return "Цена уточняется";
    return formatPriceAsRubles(Math.round(price), regionRate);
  }

  function calcDiscount(price: number | null, originalPrice: number | null | undefined): number | null {
    if (!price || !originalPrice || originalPrice <= price) return null;
    return Math.round((1 - price / originalPrice) * 100);
  }

  return (
    <div className="group/cart-preview relative">
      {children}

      <div
        className={`pointer-events-none absolute z-[70] w-[460px] max-w-[calc(100vw-24px)] opacity-0 transition duration-150 group-hover/cart-preview:pointer-events-auto group-hover/cart-preview:opacity-100 group-focus-within/cart-preview:pointer-events-auto group-focus-within/cart-preview:opacity-100 ${getPlacementClass(
          placement,
        )}`}
      >
        <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3.5">
            <p className="text-sm font-extrabold">
              Корзина
            </p>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              {regionCart.length > 0 ? `${regionCart.length} поз.` : "Пусто"}
            </p>
          </div>

          {regionCart.length === 0 ? (
            <div className="px-5 py-6 text-sm leading-6 text-[var(--text-muted)]">
              В корзине пока ничего нет.
              Добавь игру из каталога.
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto p-3">
                {regionCart.map((item) => {
                  const discount = calcDiscount(item.price, item.originalPrice);
                  const editionLabel = item.edition ?? (() => {
                    const sep = item.title.indexOf(" — ");
                    return sep !== -1 ? item.title.slice(sep + 3) : undefined;
                  })();
                  const displayTitle = item.edition
                    ? item.title
                    : item.title.includes(" — ")
                      ? item.title.slice(0, item.title.indexOf(" — "))
                      : item.title;

                  return (
                    <div
                      key={`${item.region}-${item.id}`}
                      className="flex items-center gap-3 rounded-[14px] p-2.5 transition hover:bg-[var(--paper)]"
                    >
                      <div className="relative h-[68px] w-[60px] shrink-0 overflow-hidden rounded-[10px] bg-[var(--paper)] shadow-sm">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="60px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold leading-[1.3] text-[var(--ink)]">
                          {displayTitle}
                        </p>
                        {editionLabel && (
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--text-muted)]">
                            {editionLabel}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[13px] font-extrabold leading-none tracking-[-0.03em] text-[var(--ink)]">
                            {fmtPrice(item.price)}
                          </span>
                          {discount !== null && (
                            <span className="inline-flex h-[18px] items-center rounded-[5px] bg-[var(--coral)] px-1.5 text-[10px] font-extrabold leading-none text-white">
                              −{discount}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.id, item.region)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-base font-black leading-none text-[var(--ink)] transition hover:bg-[var(--paper)]"
                          aria-label={`Уменьшить количество ${item.title}`}
                        >
                          −
                        </button>
                        <span className="min-w-[22px] text-center text-sm font-black">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            addToCart({
                              id: item.id,
                              region: item.region,
                              title: item.title,
                              edition: item.edition,
                              price: item.price,
                              originalPrice: item.originalPrice,
                              formattedPrice: item.formattedPrice,
                              image: item.image,
                            })
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-base font-black leading-none text-[var(--ink)] transition hover:bg-[var(--signal)]"
                          aria-label={`Увеличить количество ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[var(--line)] px-5 py-3.5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text-muted)]">
                    Итого
                  </span>
                  <span className="font-black text-[var(--ink)]">
                    {formatPriceAsRubles(Math.round(total), regionRate)}
                  </span>
                </div>
                {otherCount > 0 && (
                  <p className="mb-3 text-xs text-[var(--text-muted)]">
                    + {otherCount} поз. в корзине другого региона
                  </p>
                )}
                <Link
                  href="/cart"
                  className="flex w-full items-center justify-center rounded-[12px] bg-[var(--signal)] px-4 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
                >
                  Открыть корзину
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
