"use client";

import { useMemo } from "react";
import { formatRubles } from "@/lib/pricing/rates";
import type { Product } from "@/lib/products/types";
import { useStore } from "@/store/useStore";

// Budget steps in ruble MAJOR units; stored in the cart as minor (×100).
export const BUDGET_STEPS = [500, 1000, 1500, 2000, 3000, 5000, 7000, 10000];

export default function BudgetHero({ products }: { products: Product[] }) {
  const selectedBudget = useStore((state) => state.selectedBudget);
  const setSelectedBudget = useStore((state) => state.setSelectedBudget);

  const budgetMajor = Math.round(selectedBudget / 100);
  const closestIndex = useMemo(() => {
    let best = 0;
    for (let i = 0; i < BUDGET_STEPS.length; i += 1) {
      if (Math.abs(BUDGET_STEPS[i] - budgetMajor) < Math.abs(BUDGET_STEPS[best] - budgetMajor)) {
        best = i;
      }
    }
    return best;
  }, [budgetMajor]);

  const fitCount = useMemo(
    () =>
      products.filter(
        (p) => p.salePriceMinor != null && p.salePriceMinor <= selectedBudget,
      ).length,
    [products, selectedBudget],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 md:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-12 text-white md:px-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--signal)]">
              Карты и пополнения
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.05] tracking-[-0.04em] md:text-6xl">
              Выбери бюджет —
              <br />
              подберём коды
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/60 md:text-lg">
              Steam, PlayStation, App Store и другие сервисы. Моментальная
              доставка кода на почту после оплаты.
            </p>
          </div>

          <div className="rounded-[22px] bg-white/[0.06] p-6 md:p-7">
            <p className="text-sm font-semibold text-white/55">Ваш бюджет</p>
            <p className="mt-1 font-[family-name:var(--font-unbounded)] text-4xl font-bold tracking-[-0.03em] text-[var(--signal)] md:text-5xl">
              {formatRubles(selectedBudget)}
            </p>

            <label className="mt-6 block">
              <span className="sr-only">Желаемый бюджет</span>
              <input
                type="range"
                min={0}
                max={BUDGET_STEPS.length - 1}
                step={1}
                value={closestIndex}
                onChange={(e) =>
                  setSelectedBudget(BUDGET_STEPS[Number(e.target.value)] * 100)
                }
                aria-label="Желаемый бюджет"
                className="w-full accent-[var(--signal)]"
              />
            </label>
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-white/40">
              <span>{BUDGET_STEPS[0].toLocaleString("ru-RU")} ₽</span>
              <span>{BUDGET_STEPS[BUDGET_STEPS.length - 1].toLocaleString("ru-RU")} ₽</span>
            </div>

            <a
              href="#catalog"
              className="mt-6 flex w-full items-center justify-center rounded-[13px] bg-[var(--signal)] px-5 py-3.5 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
            >
              {fitCount > 0
                ? `Показать ${fitCount} подходящих`
                : "Смотреть каталог"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
