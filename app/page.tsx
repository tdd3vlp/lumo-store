export const dynamic = "force-dynamic";

import Header from "@/components/Header";
import BudgetHero from "@/components/BudgetHero";
import BudgetGamesSection from "@/components/BudgetGamesSection";
import RegionSections from "@/components/RegionSections";
import TrustStrip from "@/components/TrustStrip";
import PromoBanner from "@/components/PromoBanner";
import { getPsnGamesForRegion, getCollectionsForRegion, getFeaturedPromoForRegion } from "@/lib/psn/storefront";
import { newGames } from "@/data/newGames";
import { preorderGames } from "@/data/preorderGames";
import type { Game } from "@/data/mockGames";

function customerChoiceCovers(games: Game[]) {
  const rated = games.filter(
    (game) => game.rating != null && (game.ratingsCount ?? 0) > 0,
  );
  const average =
    rated.length > 0
      ? rated.reduce((sum, game) => sum + (game.rating ?? 0), 0) / rated.length
      : 0;
  const sortedByCount = [...rated].sort(
    (a, b) => (a.ratingsCount ?? 0) - (b.ratingsCount ?? 0),
  );
  const threshold =
    sortedByCount[Math.floor(sortedByCount.length / 2)]?.ratingsCount ?? 1;
  const score = (game: Game) => {
    const votes = game.ratingsCount ?? 0;
    const rating = game.rating ?? 0;
    if (votes === 0) return 0;
    return (votes * rating + threshold * average) / (votes + threshold);
  };

  return [...games]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4)
    .map((game) => ({
      id: game.id,
      title: game.title,
      image: game.image,
    }));
}

export default async function Home() {
  const [gamesTR, collectionsTR, featuredPromoTR] = await Promise.all([
    getPsnGamesForRegion("TR"),
    getCollectionsForRegion("TR"),
    getFeaturedPromoForRegion("TR"),
  ]);

  const catalog = { TR: gamesTR };
  const collections = { TR: collectionsTR };

  const heroCovers = {
    TR: customerChoiceCovers(gamesTR),
  };

  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />
      <BudgetHero coverGames={heroCovers} />

      {featuredPromoTR && (
        <PromoBanner
          game={featuredPromoTR.game}
          releaseLabel={featuredPromoTR.releaseLabel}
          ctaLabel={featuredPromoTR.ctaLabel}
        />
      )}

      {/* Лидеры продаж, Выбор покупателей, Новинки, Предзаказы */}
      <div className="mt-10">
        <RegionSections
          catalog={catalog}
          collections={collections}
          staticNewGames={newGames.slice(0, 20)}
          staticPreorders={preorderGames.slice(0, 20)}
          part="top"
        />
      </div>

      <div className="mt-10">
        <TrustStrip />
      </div>

      {/* Игры под бюджет */}
      <div className="mt-10">
        <BudgetGamesSection catalog={catalog} />
      </div>

      {/* Скидки недели, жанры, коллекции */}
      <div className="mt-10">
        <RegionSections
          catalog={catalog}
          collections={collections}
          part="bottom"
        />
      </div>
    </main>
  );
}
