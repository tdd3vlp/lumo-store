"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import GameRowSection from "@/components/GameRowSection";
import type { StoreRegion } from "@/store/useStore";
import type { Game } from "@/data/mockGames";
import type { CollectionSection } from "@/lib/psn/storefront";
import { WELL_KNOWN_COLLECTIONS } from "@/lib/psn/types";

type Props = {
  catalog: Record<StoreRegion, Game[]>;
  collections: Record<StoreRegion, CollectionSection[]>;
  staticNewGames?: Game[];
  staticPreorders?: Game[];
};

// Genres we show as dedicated rows, in display order.
const GENRE_ROWS: { genre: string; title: string }[] = [
  { genre: "Action",            title: "Экшн" },
  { genre: "Adventure",         title: "Приключения" },
  { genre: "Role Playing Games",title: "Ролевые игры" },
  { genre: "Shooter",           title: "Шутеры" },
  { genre: "Sport",             title: "Спорт" },
  { genre: "Horror",            title: "Хоррор" },
  { genre: "Simulation",        title: "Симуляторы" },
  { genre: "Racing",            title: "Гонки" },
  { genre: "Fighting",          title: "Файтинги" },
  { genre: "Family",            title: "Для всей семьи" },
];

export default function RegionSections({
  catalog,
  collections,
  staticNewGames = [],
  staticPreorders = [],
}: Props) {
  const selectedRegion = useStore((s) => s.selectedRegion);
  const games = useMemo(
    () => catalog[selectedRegion] ?? [],
    [catalog, selectedRegion],
  );
  const allCollections = useMemo(
    () => collections[selectedRegion] ?? [],
    [collections, selectedRegion],
  );
  const newReleasesCollection = useMemo(
    () => allCollections.find((c) => c.nameRu === WELL_KNOWN_COLLECTIONS.NEW_RELEASES),
    [allCollections],
  );
  const preordersCollection = useMemo(
    () => allCollections.find((c) => c.nameRu === WELL_KNOWN_COLLECTIONS.PREORDERS),
    [allCollections],
  );
  const activeCollections = useMemo(
    () => allCollections.filter(
      (c) => c.nameRu !== WELL_KNOWN_COLLECTIONS.NEW_RELEASES &&
             c.nameRu !== WELL_KNOWN_COLLECTIONS.PREORDERS,
    ),
    [allCollections],
  );

  const newGamesRow  = newReleasesCollection?.games ?? staticNewGames;
  const preordersRow = preordersCollection?.games   ?? staticPreorders;

  // Скидки недели — топ-20 по % скидки (уже отсортированы БД)
  const weekDeals = games.slice(0, 20);

  // Лидеры продаж — порядок из PS Store выдачи sortBy=sales30.
  const salesLeaders = useMemo(
    () =>
      games
        .filter((g) => g.salesRank != null)
        .sort((a, b) => (a.salesRank ?? Number.MAX_SAFE_INTEGER) - (b.salesRank ?? Number.MAX_SAFE_INTEGER))
        .slice(0, 20),
    [games],
  );

  // Байесовская оценка (как у IMDB): score = (v*R + m*C) / (v+m)
  // C = средний рейтинг, m = медиана кол-ва оценок (порог доверия)
  // Игра с 4.8/5 голосов уступает игре с 4.7/100 000 голосов.
  const ratingStats = useMemo(() => {
    const rated = games.filter((g) => g.rating != null && (g.ratingsCount ?? 0) > 0);
    if (rated.length === 0) return { average: 0, threshold: 1 };
    const C = rated.reduce((s, g) => s + (g.rating ?? 0), 0) / rated.length;
    const sortedByCount = [...rated].sort((a, b) => (a.ratingsCount ?? 0) - (b.ratingsCount ?? 0));
    const m = sortedByCount[Math.floor(sortedByCount.length / 2)]?.ratingsCount ?? 1;
    return { average: C, threshold: m };
  }, [games]);

  // Выбор покупателей — топ-20 по взвешенному рейтингу
  const customerChoice = useMemo(() => {
    const score = (g: (typeof games)[0]) => {
      const v = g.ratingsCount ?? 0;
      const R = g.rating ?? 0;
      if (v === 0) return 0;
      return (v * R + ratingStats.threshold * ratingStats.average) /
        (v + ratingStats.threshold);
    };

    return [...games].sort((a, b) => score(b) - score(a)).slice(0, 20);
  }, [games, ratingStats]);

  // Активные жанровые секции (минимум 4 игры в жанре)
  const genreSections = useMemo(() => {
    const score = (g: (typeof games)[0]) => {
      const v = g.ratingsCount ?? 0;
      const R = g.rating ?? 0;
      if (v === 0) return 0;
      return (v * R + ratingStats.threshold * ratingStats.average) /
        (v + ratingStats.threshold);
    };

    return GENRE_ROWS.flatMap(({ genre, title }) => {
      const filtered = games
        .filter((g) => g.genres?.includes(genre))
        .sort((a, b) => score(b) - score(a))
        .slice(0, 20);
      return filtered.length >= 4 ? [{ title, games: filtered }] : [];
    });
  }, [games, ratingStats]);

  return (
    <div className="space-y-10 md:space-y-12">
      <GameRowSection title="Скидки недели" games={weekDeals} />
      {salesLeaders.length > 0 && (
        <GameRowSection title="Лидеры продаж" games={salesLeaders} />
      )}
      <GameRowSection title="Выбор покупателей" games={customerChoice} />
      {newGamesRow.length > 0 && (
        <GameRowSection title="Новинки" games={newGamesRow} />
      )}
      {preordersRow.length > 0 && (
        <GameRowSection title="Предзаказы" games={preordersRow} />
      )}
      {genreSections.map(({ title, games: g }) => (
        <GameRowSection key={title} title={title} games={g} />
      ))}
      {activeCollections.map(({ id, nameRu, games: g }) => (
        <GameRowSection key={id} title={nameRu} games={g} />
      ))}
    </div>
  );
}
