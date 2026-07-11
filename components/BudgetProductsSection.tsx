"use client";

import { useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { formatRubles } from "@/lib/pricing/rates";
import type { Product } from "@/lib/products/types";
import { useStore } from "@/store/useStore";

export default function BudgetProductsSection({
  products,
}: {
  products: Product[];
}) {
  const selectedBudget = useStore((state) => state.selectedBudget);
  const search = useStore((state) => state.search);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const withinBudget =
        p.salePriceMinor != null && p.salePriceMinor <= selectedBudget;
      const matchesQuery =
        !q ||
        p.displayName.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q);
      return withinBudget && matchesQuery;
    });
  }, [products, selectedBudget, search]);

  return (
    <section id="catalog" className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--signal)]" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
          Под ваш бюджет
        </h2>
        <span className="text-sm font-semibold text-[var(--text-muted)]">
          до {formatRubles(selectedBudget)}
        </span>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-[16px] border border-[var(--line)] bg-[var(--card-surface)] p-6 text-[var(--text-muted)]">
          {search.trim()
            ? "Ничего не найдено по запросу в этом бюджете."
            : "В этом бюджете пока нет доступных товаров. Попробуйте увеличить бюджет."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {matches.map((product) => (
            <ProductCard key={product.denominationId} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
