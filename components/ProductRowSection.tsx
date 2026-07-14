import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products/types";

export default function ProductRowSection({
  title,
  products,
  id,
  limit,
  seeAllHref,
}: {
  title: string;
  products: Product[];
  id?: string;
  limit?: number;
  seeAllHref?: string;
}) {
  if (products.length === 0) return null;

  const shown = limit ? products.slice(0, limit) : products;
  const hasMore = limit ? products.length > limit : false;

  return (
    <section id={id} className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 scroll-mt-20">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--signal)]" aria-hidden="true" />
          <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
            {title}
          </h2>
        </div>
        {seeAllHref && (hasMore || limit) && (
          <Link
            href={seeAllHref}
            className="shrink-0 text-sm font-bold text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--ink)] hover:underline"
          >
            Смотреть все{products.length > (limit ?? 0) ? ` (${products.length})` : ""} →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {shown.map((product) => (
          <ProductCard key={product.denominationId} product={product} />
        ))}
      </div>
    </section>
  );
}
