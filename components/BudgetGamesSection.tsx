"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import type { StoreRegion } from "@/store/useStore";
import type { Game } from "@/data/mockGames";
import GameRowSection from "@/components/GameRowSection";

type Props = {
  catalog: Record<StoreRegion, Game[]>;
};

export default function BudgetGamesSection({ catalog }: Props) {
  const selectedRegion = useStore((state) => state.selectedRegion);
  const selectedBudgets = useStore((state) => state.selectedBudgets);
  const selectedBudget = selectedBudgets[selectedRegion];

  const regionGames = useMemo(
    () => catalog[selectedRegion] ?? [],
    [catalog, selectedRegion],
  );

  const budgetGames = useMemo(
    () =>
      regionGames
        .filter((g) => typeof g.price === "number" && g.price <= selectedBudget)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 20),
    [regionGames, selectedBudget],
  );

  if (budgetGames.length === 0) {
    return (
      <section
        id="budget-games"
        className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8"
      >
        <h2 className="text-xl font-bold tracking-tight text-[var(--text)] md:text-2xl">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-4 w-1 rounded-sm bg-[var(--signal-strong)]"
              aria-hidden="true"
            />
            Игры под твой бюджет
          </span>
        </h2>
        <p className="mt-4 text-[var(--text-muted)]">
          Каталог турецкого магазина
          скоро появится.{" "}
          <Link href="/cart" className="font-semibold underline underline-offset-2 hover:text-[var(--ink)]">
            Перейти в корзину
          </Link>
        </p>
      </section>
    );
  }

  return (
    <GameRowSection
      title="Игры под твой бюджет"
      games={budgetGames}
      id="budget-games"
    />
  );
}
