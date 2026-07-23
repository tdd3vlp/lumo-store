"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaPlaystation } from "react-icons/fa6";
import RegionPriceRow from "@/components/games/RegionPriceRow";
import type { PricedGame } from "@/lib/games/pricing";

const ROTATE_MS = 5000;

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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
export default function GamesShowcase({ games }: { games: PricedGame[] }) {
  const [gameIdx, setGameIdx] = useState(0);
  const [editionIdx, setEditionIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const game = games[gameIdx];

  useEffect(() => {
    if (paused || games.length < 2) return;
    const id = setInterval(
      () => setGameIdx((i) => (i + 1) % games.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [paused, games.length]);

  // Rotating to another game resets its edition/region view. Derived during
  // render (React's "adjust state while rendering" pattern, as in HeroCarousel)
  // so the committed DOM is already correct — an effect would paint one frame of
  // the previous game's edition first.
  const [prevGameIdx, setPrevGameIdx] = useState(gameIdx);
  if (prevGameIdx !== gameIdx) {
    setPrevGameIdx(gameIdx);
    setEditionIdx(0);
  }

  if (!game) return null;
  const edition = game.editions[Math.min(editionIdx, game.editions.length - 1)];
  const regions = edition?.regions ?? [];

  return (
    <div
      className="overflow-x-clip rounded-[28px] bg-[var(--ink)] px-6 py-8 text-white md:px-10 md:py-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full-width title, then a two-column row: game cover (left) level with
          the region-picker lead (right). Left column stacks before right, so
          mobile shows the game before the regions. */}
      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">
        <FaPlaystation className="h-4 w-4 text-white/80" />
        PlayStation
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-3xl font-bold leading-[1.02] tracking-[-0.04em] text-white sm:whitespace-nowrap sm:text-4xl md:text-5xl">
        Игры и <span className="text-[var(--signal)]">предзаказы</span>
      </h2>

      {/* Three blocks — game, regions, catalog CTA. Explicit placement keeps the
          desktop layout (game top-left, regions right, CTA under the game) while
          the DOM order (game, regions, CTA) makes the CTA last when it all
          stacks on mobile. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-x-10 lg:gap-y-3">
        {/* Left: game cover + edition picker */}
        <div className="flex flex-col lg:col-start-1 lg:row-start-1">
          <div
            key={game.slug}
            className="relative aspect-[16/9] overflow-hidden rounded-[24px] bg-black/40 [animation:gameFade_600ms_ease]"
          >
            <Image
              src={game.cover}
              alt={game.title}
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover"
              priority
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 md:p-6">
              <div>
                <span className="rounded-lg bg-black/45 px-2.5 py-1 text-xs font-extrabold tracking-wide backdrop-blur">
                  {game.platform}
                </span>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-unbounded)] text-xl font-bold uppercase leading-[1.05] tracking-[-0.02em] drop-shadow sm:text-2xl md:text-4xl">
                  {game.title}
                </h3>
                <span className="mt-2 inline-flex rounded-md border border-white/40 bg-black/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide backdrop-blur sm:px-2.5 sm:py-1 sm:text-[11px]">
                  {edition?.name}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm sm:mt-4">
                  <span className="inline-flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-white/70" />
                    <span>
                      <span className="block text-xs text-white/60">
                        Дата выхода
                      </span>
                      {formatDate(game.releaseDate)}
                    </span>
                  </span>
                  <span className="hidden items-center gap-2 sm:inline-flex">
                    <span className="h-2 w-2 rounded-full bg-[var(--signal)]" />
                    Оформи предзаказ уже сейчас
                  </span>
                </div>
              </div>
            </div>
            {games.length > 1 && (
              <div className="absolute bottom-4 right-5 flex gap-1.5">
                {games.map((g, i) => (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => setGameIdx(i)}
                    aria-label={`Показать ${g.title}`}
                    className={`h-1.5 rounded-full transition-all ${i === gameIdx ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {game.editions.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {game.editions.map((ed, i) => {
                const active =
                  i === Math.min(editionIdx, game.editions.length - 1);
                return (
                  <button
                    key={`${ed.name}-${i}`}
                    type="button"
                    onClick={() => setEditionIdx(i)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-[13px] border px-3 py-1.5 text-xs font-semibold transition sm:px-3.5 sm:py-2 sm:text-sm ${
                      active
                        ? "border-transparent bg-[var(--signal)] text-[var(--ink)]"
                        : "border-white/15 bg-white/[0.06] text-white hover:border-white/40"
                    }`}
                  >
                    {ed.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: region picker — regions as linear rows, then the note. */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <p className="text-base font-semibold leading-7 text-white/80">
            Выбери лучший регион для покупки.
          </p>
          {regions.length > 0 ? (
            <>
              <div className="mt-5 flex flex-col gap-2.5">
                {regions.map((rp) => (
                  <RegionPriceRow key={rp.region} rp={rp} />
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">
                Выберите игру в каталоге и оформите заказ.
              </p>
            </>
          ) : (
            <p className="mt-5 rounded-[16px] border border-white/12 bg-white/[0.05] p-4 text-sm text-white/60">
              Цены пока не рассчитаны — нет подходящих номиналов карт в
              каталоге.
            </p>
          )}

          {/* Catalog CTA — under the regions on the right. */}
          <Link
            href="/catalog/games"
            className="mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-[var(--signal-strong)] px-8 py-4 text-base font-extrabold text-[var(--ink)] shadow-[0_10px_30px_rgba(200,245,0,0.25)] transition hover:bg-[var(--signal)] max-sm:w-full"
          >
            Посмотреть весь каталог
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
