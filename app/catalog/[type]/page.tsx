import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { allowedRegions } from "@/lib/products/brands";
import { productTypeLabel, regionLabel } from "@/lib/products/labels";
import { getPublishedProducts } from "@/lib/products/storefront";
import type { Product } from "@/lib/products/types";

export const dynamic = "force-dynamic";

export default async function CatalogTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  let products: Product[] = [];
  try {
    products = await getPublishedProducts();
  } catch {
    products = [];
  }

  const regions = allowedRegions(type);
  const inType = products.filter(
    (p) => p.productType === type && (regions === null || regions.includes(p.region)),
  );
  if (inType.length === 0) notFound();

  // group by region, ordered by number of items desc
  const groups = new Map<string, Product[]>();
  for (const p of inType) {
    const list = groups.get(p.region) ?? [];
    list.push(p);
    groups.set(p.region, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>{productTypeLabel(type)}</span>
        </nav>

        <h1 className="mb-8 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
          {productTypeLabel(type)}
        </h1>

        <div className="space-y-12">
          {ordered.map(([region, items]) => (
            <section key={region}>
              <h2 className="mb-4 text-lg font-bold text-[var(--ink)]">
                {regionLabel(region)}
                <span className="ml-2 text-sm font-semibold text-[var(--text-muted)]">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
                {items
                  .sort((a, b) => a.amountMajor - b.amountMajor)
                  .map((p) => (
                    <ProductCard key={p.denominationId} product={p} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
