"use client";

import Image from "next/image";
import Link from "next/link";
import { useGameCart } from "@/components/games/useGameCart";
import { formatRubles } from "@/lib/pricing/rates";
import type { PricedGame, RegionPrice } from "@/lib/games/pricing";

function formatDate(iso: string): string {
  // `iso` is a bare calendar date ("2026-10-23"); new Date() reads it as UTC
  // midnight, so format in UTC too — otherwise a viewer west of UTC renders the
  // previous day ("22 октября"). See releaseOf() in lib/games/psn-fetch.ts.
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Cheapest region across every edition — the default "add to cart" pick. */
function cheapestRegion(game: PricedGame): RegionPrice | null {
  let best: RegionPrice | null = null;
  for (const ed of game.editions) {
    for (const r of ed.regions) {
      if (!best || r.rubleMinor < best.rubleMinor) best = r;
    }
  }
  return best;
}

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

export default function GameCard({ game }: { game: PricedGame }) {
  const buy = useGameCart();
  const cheapest = cheapestRegion(game);

  return (
    <div className="group overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--card-surface)] transition hover:border-[var(--ink)]/40">
      <Link href={`/catalog/games/${game.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-black/10">
          <Image
            src={game.cover}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-extrabold tracking-wide text-white backdrop-blur">
            {game.platform}
          </span>
        </div>
      </Link>

      <div className="p-5">
        <Link href={`/catalog/games/${game.slug}`} className="block">
          <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-semibold leading-snug tracking-[-0.02em] text-[var(--ink)]">
            {game.title}
          </h2>
        </Link>
        <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
          Выходит {formatDate(game.releaseDate)}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)]">от</p>
            <p className="font-[family-name:var(--font-unbounded)] text-xl font-bold tracking-[-0.03em] text-[var(--ink)]">
              {cheapest ? formatRubles(cheapest.rubleMinor) : "—"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/catalog/games/${game.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--signal)] px-4 py-2 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
            >
              Сравнить цены
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {cheapest && (
              <button
                type="button"
                onClick={() => buy(cheapest)}
                aria-label="В корзину — лучшая цена"
                title="В корзину — лучшая цена"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                <CartIcon />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
