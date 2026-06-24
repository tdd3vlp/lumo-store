"use client";

import Link from "next/link";
import type React from "react";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";

type CartPreviewProps = {
  children: React.ReactNode;
  placement?: "below-right" | "above-right" | "left";
};

function formatINR(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

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
    () => cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [cart],
  );

  return (
    <div className="group/cart-preview relative">
      {children}

      <div
        className={`pointer-events-none absolute z-[70] w-[340px] max-w-[calc(100vw-24px)] opacity-0 transition duration-150 group-hover/cart-preview:pointer-events-auto group-hover/cart-preview:opacity-100 group-focus-within/cart-preview:pointer-events-auto group-focus-within/cart-preview:opacity-100 ${getPlacementClass(
          placement,
        )}`}
      >
        <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-extrabold">Корзина</p>
            <p className="text-xs font-bold text-[var(--text-muted)]">
              {cart.length > 0 ? `${cart.length} поз.` : "Пусто"}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="px-4 py-5 text-sm leading-6 text-[var(--text-muted)]">
              Добавь игру или карту пополнения, и здесь появится быстрый список
              покупок.
            </div>
          ) : (
            <>
              <div className="max-h-[260px] overflow-y-auto p-2">
                {cart.map((item) => (
                  <div
                    key={`${item.region}-${item.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2 py-2 transition hover:bg-[var(--paper)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--ink)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--text-muted)]">
                        {item.price != null ? formatINR(item.price) : "Цена уточняется"} · {item.region}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => decreaseCartItem(item.id, item.region)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-base font-black leading-none text-[var(--ink)] transition hover:bg-[var(--paper)]"
                        aria-label={`Уменьшить количество ${item.title}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm font-black">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: item.id,
                            region: item.region,
                            title: item.title,
                            price: item.price,
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
                ))}
              </div>

              <div className="border-t border-[var(--line)] px-4 py-3">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text-muted)]">
                    Итого
                  </span>
                  <span className="font-black text-[var(--ink)]">
                    {formatINR(total)}
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
