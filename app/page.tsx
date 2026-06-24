import Header from "@/components/Header";
import BudgetHero from "@/components/BudgetHero";
import BudgetGamesSection from "@/components/BudgetGamesSection";
import GameRowSection from "@/components/GameRowSection";
import TrustStrip from "@/components/TrustStrip";
import { psnDeals } from "@/data/psnDeals";
import { newGames } from "@/data/newGames";
import { preorderGames } from "@/data/preorderGames";

export default function Home() {
  const heroCovers = psnDeals.slice(0, 4).map((g) => ({
    id: g.id,
    title: g.title,
    image: g.image,
  }));

  // "Скидки недели" — порядок как в файле
  const weekDeals = psnDeals.slice(0, 20);

  // "Новинки" — порядок как в файле
  const newReleases = newGames.slice(0, 20);

  // "Предзаказы" — порядок как в файле
  const preorders = preorderGames.slice(0, 20);

  // "Выбор покупателей" — из Deals, по рейтингу
  const customerChoice = psnDeals
    .filter((g) => g.rating !== null)
    .sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (Math.abs(ratingDiff) > 0.09) return ratingDiff;
      // При одинаковом рейтинге озвучка приоритетнее субтитров
      return (b.russianVoice ? 1 : 0) - (a.russianVoice ? 1 : 0);
    })
    .slice(0, 20);

  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />
      <BudgetHero coverGames={heroCovers} />

      {/* 1. Игры под твой бюджет — client component, фильтрует по selectedBudget */}
      <div className="mt-10">
        <BudgetGamesSection />
      </div>

      <div className="mt-8">
        <TrustStrip />
      </div>

      <div className="mt-10 space-y-10 md:space-y-12">
        {/* 2. Скидки недели */}
        <GameRowSection title="Скидки недели" games={weekDeals} />

        {/* 3. Новинки */}
        <GameRowSection title="Новинки" games={newReleases} />

        {/* 4. Предзаказы */}
        <GameRowSection title="Предзаказы" games={preorders} />

        {/* 5. Выбор покупателей */}
        <GameRowSection title="Выбор покупателей" games={customerChoice} />
      </div>
    </main>
  );
}
