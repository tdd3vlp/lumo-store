"use client";

import { useRef } from "react";
import GameCard from "@/components/GameCard";
import type { Game } from "@/data/mockGames";

type Props = {
  title: string;
  games: Game[];
};

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GameRowSection({ title, games }: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const scrollRow = (direction: "left" | "right") => {
    if (!rowRef.current) return;

    const amount = direction === "left" ? -720 : 720;

    rowRef.current.scrollBy({
      left: amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-[#2a1f44] md:text-2xl">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollRow("left")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-[#5f4b84] shadow-sm transition hover:bg-white"
            aria-label={`Прокрутить секцию ${title} влево`}
          >
            <ArrowLeftIcon />
          </button>

          <button
            type="button"
            onClick={() => scrollRow("right")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-[#5f4b84] shadow-sm transition hover:bg-white"
            aria-label={`Прокрутить секцию ${title} вправо`}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((game) => (
          <GameCard
            key={game.id}
            id={game.id}
            title={game.title}
            price={game.price}
            image={game.image}
          />
        ))}
      </div>
    </section>
  );
}
