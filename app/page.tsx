import Header from "@/components/Header";
import BudgetHero from "@/components/BudgetHero";
import BudgetProductsSection from "@/components/BudgetProductsSection";
import ProductRowSection from "@/components/ProductRowSection";
import TrustStrip from "@/components/TrustStrip";
import { productTypeLabel } from "@/lib/products/labels";
import { getPublishedProducts } from "@/lib/products/storefront";
import type { Product } from "@/lib/products/types";

export const dynamic = "force-dynamic";

function groupByType(products: Product[]): Array<[string, Product[]]> {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const list = groups.get(product.productType) ?? [];
    list.push(product);
    groups.set(product.productType, list);
  }
  return [...groups.entries()];
}

export default async function Home() {
  let products: Product[] = [];
  try {
    products = await getPublishedProducts();
  } catch {
    products = [];
  }

  const groups = groupByType(products);
  const hasCatalog = products.length > 0;

  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />
      <BudgetHero products={products} />

      {hasCatalog ? (
        <>
          <div className="mt-10">
            <BudgetProductsSection products={products} />
          </div>

          <div className="mt-10">
            <TrustStrip />
          </div>

          <div className="mt-12 space-y-12">
            {groups.map(([type, items]) => (
              <ProductRowSection
                key={type}
                title={productTypeLabel(type)}
                products={items}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="mx-auto mt-10 max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card-surface)] p-8 text-center">
              <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold text-[var(--ink)]">
                Каталог скоро появится
              </h2>
              <p className="mt-2 text-[var(--text-muted)]">
                Мы наполняем витрину картами и пополнениями. Загляните чуть позже.
              </p>
            </div>
          </section>
          <div className="mt-10">
            <TrustStrip />
          </div>
        </>
      )}
    </main>
  );
}
