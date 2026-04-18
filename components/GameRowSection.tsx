"use client";

import { useRef, useState, useEffect } from "react";
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
    >
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function GameRowSection({ title, games }: Props) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const checkScroll = () => {
    const el = rowRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setIsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
  }, []);

  const scrollRow = (direction: "left" | "right") => {
    if (!rowRef.current) return;

    const el = rowRef.current;

    // 👉 если дошли до конца — возвращаем в начало
    if (direction === "right" && isAtEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    const amount = el.clientWidth * 0.8 * (direction === "left" ? -1 : 1);

    el.scrollBy({
      left: amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2a1f44] md:text-2xl">
          {title}
        </h2>

        <div className="flex gap-2">
          {/* LEFT */}
          <button
            onClick={() => scrollRow("left")}
            disabled={!canScrollLeft}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition ${
              canScrollLeft
                ? "bg-white text-[#5f4b84]"
                : "bg-white/40 text-[#b6a8d1] cursor-default"
            }`}
          >
            <ArrowLeftIcon />
          </button>

          {/* RIGHT */}
          <button
            onClick={() => scrollRow("right")}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#5f4b84]"
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        onScroll={checkScroll}
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
