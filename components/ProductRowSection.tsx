import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products/types";

export default function ProductRowSection({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--signal)]" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.denominationId} product={product} />
        ))}
      </div>
    </section>
  );
}
