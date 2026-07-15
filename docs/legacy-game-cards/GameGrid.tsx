"use client";

import GameCard from "@/components/GameCard";
import { games } from "@/data/mockGames";
import { useStore } from "@/store/useStore";

export default function GameGrid() {
  const search = useStore((state) => state.search);

  const filteredGames = games.filter((game) =>
    game.title.toLowerCase().includes(search.toLowerCase().trim()),
  );

  if (filteredGames.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/60 bg-white/70 p-10 text-center text-[#7d6d99] shadow-[0_12px_24px_rgba(143,92,255,0.08)]">
        Ничего не найдено. Попробуй другой запрос.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-5 xl:justify-start">
      {filteredGames.map((game) => (
        <GameCard
          key={game.id}
          id={game.id}
          title={game.title}
          price={game.price}
          image={game.image}
        />
      ))}
    </div>
  );
}
