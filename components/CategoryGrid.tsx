import Link from "next/link";
import { formatRubles } from "@/lib/pricing/rates";
import { brandAccent } from "@/lib/products/brands";
import { productTypeLabel } from "@/lib/products/labels";
import type { Product } from "@/lib/products/types";

type Category = { type: string; count: number; minPriceMinor: number | null };

function buildCategories(products: Product[]): Category[] {
  const map = new Map<string, Category>();
  for (const p of products) {
    const c = map.get(p.productType) ?? { type: p.productType, count: 0, minPriceMinor: null };
    c.count += 1;
    if (p.salePriceMinor != null) {
      c.minPriceMinor =
        c.minPriceMinor == null ? p.salePriceMinor : Math.min(c.minPriceMinor, p.salePriceMinor);
    }
    map.set(p.productType, c);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export default function CategoryGrid({ products }: { products: Product[] }) {
  const categories = buildCategories(products);
  if (categories.length === 0) return null;

  return (
    <section id="catalog" className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--signal)]" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
          Категории
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {categories.map((c) => {
          const accent = brandAccent(c.type);
          return (
            <Link
              key={c.type}
              href={`/catalog/${c.type}`}
              className="group relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-[18px] p-4 transition hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(150deg, ${accent.from}, ${accent.to})`,
                color: accent.text,
              }}
            >
              <span className="font-[family-name:var(--font-unbounded)] text-lg font-bold leading-tight">
                {productTypeLabel(c.type)}
              </span>
              <span className="flex items-end justify-between gap-2">
                <span className="text-sm font-semibold opacity-80">
                  {c.minPriceMinor != null ? `от ${formatRubles(c.minPriceMinor)}` : " "}
                </span>
                <span className="text-xs font-bold opacity-60">{c.count} шт.</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
