"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import type { Game } from "@/data/mockGames";

type Props = {
  game: Game;
  releaseLabel: string;
  ctaLabel: string;
};

export default function PromoBanner({ game, releaseLabel, ctaLabel }: Props) {
  const selectedRegion = useStore((s) => s.selectedRegion);
  const regionRate = useRegionRate(selectedRegion);

  const formattedPrice =
    game.price != null ? formatPriceAsRubles(game.price, regionRate) : null;

  const bgImage = game.screenshots?.[0] ?? game.image;

  return (
    <section className="px-0 mt-6 md:px-6 md:mt-8 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden bg-[var(--ink)] md:rounded-[24px]">
        {bgImage && (
          <div className="absolute inset-0" aria-hidden="true">
            <Image
              src={bgImage}
              alt=""
              fill
              sizes="100vw"
              className="scale-110 object-cover opacity-20 blur-2xl"
            />
          </div>
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/80 to-[var(--ink)]/30"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:gap-8 md:px-10 md:py-10 lg:px-14 lg:py-12">
          {/* Cover art */}
          <div className="w-28 shrink-0 overflow-hidden rounded-[14px] border-2 border-white/15 shadow-2xl sm:w-36 md:w-48 lg:w-56">
            <Image
              src={game.image}
              alt={game.title}
              width={224}
              height={224}
              className="aspect-square w-full object-cover"
              priority
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center rounded-full bg-[var(--signal)] px-3 py-1 text-xs font-extrabold text-[var(--ink)]">
              {releaseLabel}
            </span>
            <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-2xl font-bold leading-tight tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
              {game.title}
            </h2>
            {game.description && (
              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
                {game.description}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {formattedPrice != null && (
                <span className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  {formattedPrice}
                </span>
              )}
              <Link
                href={`/game/${game.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--signal)] px-5 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-strong)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
