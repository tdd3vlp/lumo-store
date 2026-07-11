"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useMemo } from "react";
import { formatRubles } from "@/lib/pricing/rates";
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

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.priceMinor ?? 0) * item.quantity, 0),
    [cart],
  );

  function fmtPrice(priceMinor: number | null): string {
    if (priceMinor == null) return "Цена уточняется";
    return formatRubles(priceMinor);
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
              {cart.length > 0 ? `${cart.length} поз.` : "Пусто"}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="px-5 py-6 text-sm leading-6 text-[var(--text-muted)]">
              В корзине пока ничего нет.
              Добавь карту или пополнение из каталога.
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto p-3">
                {cart.map((item) => (
                  <div
                    key={item.denominationId}
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
                        {item.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[13px] font-extrabold leading-none tracking-[-0.03em] text-[var(--ink)]">
                          {fmtPrice(item.priceMinor)}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => decreaseCartItem(item.denominationId)}
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
                            denominationId: item.denominationId,
                            productType: item.productType,
                            title: item.title,
                            region: item.region,
                            currency: item.currency,
                            amountMajor: item.amountMajor,
                            priceMinor: item.priceMinor,
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
                ))}
              </div>

              <div className="border-t border-[var(--line)] px-5 py-3.5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text-muted)]">
                    Итого
                  </span>
                  <span className="font-black text-[var(--ink)]">
                    {formatRubles(total)}
                  </span>
                </div>
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
