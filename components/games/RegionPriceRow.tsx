"use client";

import type { ComponentType } from "react";
import GB from "country-flag-icons/react/3x2/GB";
import IN from "country-flag-icons/react/3x2/IN";
import PL from "country-flag-icons/react/3x2/PL";
import TR from "country-flag-icons/react/3x2/TR";
import US from "country-flag-icons/react/3x2/US";
import { formatRubles } from "@/lib/pricing/rates";
import type { RegionPrice } from "@/lib/games/pricing";

// "UK" is our region code; the flag set files it under its ISO code, GB.
const GAME_FLAG: Record<string, ComponentType<{ className?: string }>> = {
  US,
  UK: GB,
  TR,
  IN,
  PL,
};

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M6.5 8.5h11l-1 10.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6.5 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 9V7.5a3 3 0 0 1 6 0V9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A single region rendered as a horizontal row — flag + name on the left, then
 * savings badge, ruble price and a buy button on the right. Used by both the
 * home showcase and the game detail page, which list regions linearly. Best
 * region gets the highlighted (signal) treatment.
 */
export default function RegionPriceRow({
  rp,
  onBuy,
}: {
  rp: RegionPrice;
  /** Omit to render a display-only row (no buy button) — used in the home teaser. */
  onBuy?: (rp: RegionPrice) => void;
}) {
  const Flag = GAME_FLAG[rp.region];
  return (
    <div
      className={`flex items-center gap-3 rounded-[16px] border py-2.5 pl-3.5 ${onBuy ? "pr-2.5" : "pr-4"} transition ${
        rp.best
          ? "border-[var(--signal-strong)] bg-white/[0.06]"
          : "border-white/12 bg-white/[0.04]"
      }`}
    >
      {Flag && <Flag className="h-5 w-7 shrink-0 rounded-[3px] object-cover" />}
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
        {rp.regionLabel}
      </span>

      {rp.savingsPct > 0 && (
        <span
          className={`shrink-0 rounded-[8px] px-2 py-0.5 text-xs font-bold text-white ${onBuy ? "hidden sm:inline-block" : ""}`}
          style={{ background: rp.best ? "rgba(200,245,0,0.22)" : "rgba(120,168,255,0.2)" }}
        >
          −{rp.savingsPct}%
        </span>
      )}

      <span className="shrink-0 font-[family-name:var(--font-unbounded)] text-sm font-bold tracking-[-0.02em] text-white sm:text-base">
        {formatRubles(rp.rubleMinor)}
      </span>

      {onBuy && (
        <button
          type="button"
          onClick={() => onBuy(rp)}
          aria-label={`В корзину — ${rp.regionLabel}`}
          title="В корзину"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
            rp.best
              ? "bg-[var(--signal-strong)] text-[var(--ink)] hover:bg-[var(--signal)]"
              : "border border-white/20 text-white hover:border-white/50"
          }`}
        >
          <CartIcon />
        </button>
      )}
    </div>
  );
}
