"use client";

import Image from "next/image";
import { useState } from "react";
import RegionPriceRow from "@/components/games/RegionPriceRow";
import { useGameCart } from "@/components/games/useGameCart";
import type { PricedGame } from "@/lib/games/pricing";

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

/**
 * One game, every edition — the catalog's detail view. The cover and Russian
 * description sit on the left; editions, "what's extra" and all regions on the
 * right, so the two columns end at roughly the same height.
 */
export default function GameBuyPanel({ game }: { game: PricedGame }) {
  const buy = useGameCart();
  const [editionIdx, setEditionIdx] = useState(0);

  const edition = game.editions[Math.min(editionIdx, game.editions.length - 1)];
  // Already sorted cheapest-first by pricedGames().
  const regions = edition?.regions ?? [];

  return (
    <div className="rounded-[28px] bg-[var(--ink)] px-6 py-8 text-white md:px-10 md:py-10">
      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* Cover + description */}
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] bg-black/40">
            <Image
              src={game.cover}
              alt={game.title}
              fill
              sizes="(max-width: 1024px) 100vw, 620px"
              className="object-cover"
              priority
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
              <span className="self-start rounded-lg bg-black/45 px-2.5 py-1 text-xs font-extrabold tracking-wide backdrop-blur">
                {game.platform}
              </span>
              <div>
                <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold uppercase tracking-[-0.02em] drop-shadow md:text-4xl">
                  {game.title}
                </h1>
                <span className="mt-3 inline-flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-white/70" />
                  <span>
                    <span className="block text-xs text-white/60">Дата выхода</span>
                    {formatDate(game.releaseDate)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {game.summary && (
            <p className="mt-5 text-sm leading-6 text-white/70">{game.summary}</p>
          )}

          {/* What the selected non-Standard edition adds — under the description
              on the left, next to the region picker on the right. */}
          {edition?.extras && edition.extras.length > 0 && (
            <div className="mt-5 rounded-[16px] border border-white/12 bg-white/[0.05] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                Что входит в {edition.name}
              </p>
              <ul className="mt-2.5 space-y-1.5 text-sm leading-6 text-white/80">
                {edition.extras.map((x, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)]"
                    />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Editions + regions */}
        <div>
          {game.editions.length > 1 && (
            <>
              <p className="text-sm font-bold text-white">1. Выберите издание</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.editions.map((ed, i) => {
                  const active = i === Math.min(editionIdx, game.editions.length - 1);
                  return (
                    <button
                      key={`${ed.name}-${i}`}
                      type="button"
                      onClick={() => setEditionIdx(i)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-[13px] border px-3.5 py-2 text-sm font-semibold transition ${
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
            </>
          )}

          <p className={`text-sm font-bold text-white ${game.editions.length > 1 ? "mt-6" : ""}`}>
            {game.editions.length > 1 ? "2. " : ""}Выберите регион
          </p>
          {regions.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2.5">
              {regions.map((rp) => (
                <RegionPriceRow key={rp.region} rp={rp} onBuy={buy} />
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[16px] border border-white/12 bg-white/[0.05] p-4 text-sm text-white/60">
              Цены пока не рассчитаны — нет подходящих номиналов карт в каталоге.
            </p>
          )}

          {regions.length > 0 && (
            <p className="mt-4 text-xs leading-5 text-white/40">
              В корзину будут добавлены карты пополнения нужного номинала — активируйте их на
              своём аккаунте и оформите предзаказ игры.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
