import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductPageClient from "@/components/ProductPageClient";
import { productTypeLabel } from "@/lib/products/labels";
import { getPublishedProducts } from "@/lib/products/storefront";
import type { Product } from "@/lib/products/types";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let products: Product[] = [];
  try {
    products = await getPublishedProducts();
  } catch {
    products = [];
  }

  const product = products.find((p) => p.denominationId === id);
  if (!product) notFound();

  const related = products
    .filter(
      (p) =>
        p.productType === product.productType &&
        p.denominationId !== product.denominationId,
    )
    .slice(0, 5);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-12 md:pb-16 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>{productTypeLabel(product.productType)}</span>
        </nav>

        <ProductPageClient product={product} />

        {related.length > 0 && (
          <section className="mt-14">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--signal)]" aria-hidden="true" />
              <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
                Другие номиналы
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
              {related.map((p) => (
                <ProductCard key={p.denominationId} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
