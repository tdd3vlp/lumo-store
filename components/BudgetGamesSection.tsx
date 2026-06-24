"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { psnDeals } from "@/data/psnDeals";
import GameRowSection from "@/components/GameRowSection";

export default function BudgetGamesSection() {
  const selectedBudget = useStore((state) => state.selectedBudget);

  const budgetGames = useMemo(
    () =>
      psnDeals
        .filter((g) => typeof g.price === "number" && g.price <= selectedBudget)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 20),
    [selectedBudget],
  );

  return (
    <GameRowSection
      title="Игры под твой бюджет"
      games={budgetGames}
      id="budget-games"
    />
  );
}
