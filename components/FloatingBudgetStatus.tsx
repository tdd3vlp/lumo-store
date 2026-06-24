"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";

type AnchorPosition = {
  left: number;
  top: number;
  width: number;
};

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-[22px] w-[22px] -translate-y-px"
      aria-hidden="true"
    >
      <path
        d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function FloatingBudgetStatus() {
  const pathname = usePathname();
  const selectedBudget = useStore((state) => state.selectedBudget);
  const cart = useStore((state) => state.cart);
  const [isScrolled, setIsScrolled] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<AnchorPosition | null>(
    null,
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;

    const updatePosition = () => {
      setIsScrolled(window.scrollY > 12);

      const anchor = document.querySelector<HTMLElement>(
        "[data-budget-status-anchor]",
      );

      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      setAnchorPosition({
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isHome]);

  const exceedsBudget = cartTotal > selectedBudget;
  const difference = Math.abs(selectedBudget - cartTotal);
  const isAtHero = isHome && !isScrolled;
  const positionStyle: CSSProperties | undefined =
    isAtHero && anchorPosition
      ? {
          left: anchorPosition.left,
          top: anchorPosition.top,
          width: anchorPosition.width,
        }
      : undefined;

  return (
    <aside
      className={`floating-budget-status ${
        isAtHero
          ? "floating-budget-status--hero"
          : isHome
            ? "floating-budget-status--top"
            : "floating-budget-status--bottom"
      }`}
      style={positionStyle}
      data-positioned={!isAtHero || anchorPosition ? "true" : "false"}
      aria-label="Остаток баланса"
    >
      <div className="border-r border-white/15 pr-3 sm:pr-4">
        <p className="text-[10px] font-medium text-white/52 sm:text-[11px]">
          {exceedsBudget ? "Не хватает" : "Останется"}
        </p>
        <p
          className={`mt-0.5 font-[family-name:var(--font-unbounded)] text-lg font-bold leading-none sm:text-2xl ${
            exceedsBudget ? "text-[var(--coral)]" : "text-[var(--signal)]"
          }`}
          aria-live="polite"
        >
          ₹{difference.toLocaleString("en-IN")}
        </p>
      </div>

      <dl className="grid min-w-0 flex-1 gap-1 text-[9px] text-white/48 sm:text-xs">
        <div className="flex justify-between gap-3">
          <dt>Баланс</dt>
          <dd className="font-semibold text-white">
            ₹{selectedBudget.toLocaleString("en-IN")}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>В корзине</dt>
          <dd className="font-semibold text-white">
            {cartTotal > 0 ? "−" : ""}₹{cartTotal.toLocaleString("en-IN")}
          </dd>
        </div>
      </dl>

      <Link
        href="/cart"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[var(--signal)] bg-[var(--signal)] text-[var(--ink)] transition hover:bg-[var(--signal-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label={`Перейти в корзину, товаров: ${cartCount}`}
      >
        <CartIcon />
        {cartCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--coral)] px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.28)]">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>
    </aside>
  );
}
