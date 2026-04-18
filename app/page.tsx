import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import GameRowSection from "@/components/GameRowSection";
import { games } from "@/data/mockGames";

export default function Home() {
  const budgetGames = games;
  const newReleases = [...games].slice(2, 8);
  const customerChoice = [...games].slice(0, 6);
  const bestDeals = [...games].slice(1, 7);

  return (
    <main className="min-h-screen pb-14">
      <Header />

      <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6 lg:px-8">
        <HeroCarousel />
      </section>

      <div className="mt-10 space-y-10 md:space-y-12">
        <GameRowSection title="Игры под твой бюджет" games={budgetGames} />

        <GameRowSection title="Новинки" games={newReleases} />

        <GameRowSection title="Выбор покупателей" games={customerChoice} />

        <GameRowSection title="Лучшие предложения" games={bestDeals} />
      </div>
    </main>
  );
}
