"use client";

import { useState } from "react";
import GameCard from "@/components/GameCard";
import { gameLanguageSupport } from "@/data/gameLanguageSupport";
import type { StoreRegion } from "@/store/useStore";

type RowGame = {
  id: number;
  title: string;
  price: string | number | null;
  originalPrice?: number | null;
  image: string;
  platform?: string;
  russianVoice?: boolean;
  russianSubtitles?: boolean;
  englishVoice?: boolean;
  englishSubtitles?: boolean;
  region?: StoreRegion;
};

type Props = {
  title: string;
  games: RowGame[];
  dark?: boolean;
  id?: string;
};

function ArrowIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 transition-transform duration-300 ${
        expanded ? "-rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      <path d="M5 12h13M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GameRowSection({
  title,
  games,
  dark = false,
  id,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const textColor = dark ? "text-white" : "text-[var(--text)]";
  const btnBase = dark
    ? "border-[var(--line-inverse)] bg-white/5 text-white hover:bg-white/10"
    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--text)] hover:bg-[var(--paper)]";

  return (
    <section
      id={id}
      className={`mx-auto max-w-7xl px-4 md:px-6 lg:px-8 ${dark ? "" : ""}`}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className={`text-xl font-bold tracking-tight md:text-2xl ${textColor}`}>
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-block w-1 h-4 rounded-sm ${dark ? "bg-[var(--signal)]" : "bg-[var(--signal-strong)]"}`}
              aria-hidden="true"
            />
            {title}
          </span>
        </h2>

        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${btnBase} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]`}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Свернуть" : "Смотреть все"}
          <ArrowIcon expanded={isExpanded} />
        </button>
      </div>

      <div
        className={`flex gap-5 pb-2 md:gap-6 ${
          isExpanded
            ? "flex-wrap overflow-visible"
            : "overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }`}
      >
        {games.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            title={game.title}
            price={game.price}
            originalPrice={game.originalPrice}
            image={game.image}
            platform={game.platform}
            russianVoice={game.russianVoice}
            russianSubtitles={game.russianSubtitles}
            englishVoice={
              game.englishVoice ?? gameLanguageSupport[game.id]?.englishVoice
            }
            englishSubtitles={
              game.englishSubtitles ??
              gameLanguageSupport[game.id]?.englishSubtitles
            }
            region={game.region}
          />
        ))}
      </div>
    </section>
  );
}
