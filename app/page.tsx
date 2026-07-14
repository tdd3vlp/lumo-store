import Header from "@/components/Header";
import HeroFeatured from "@/components/HeroFeatured";
import SteamTopUp from "@/components/SteamTopUp";
import { getPublishedProducts } from "@/lib/products/storefront";
import type { Product } from "@/lib/products/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];
  try {
    products = await getPublishedProducts();
  } catch {
    products = [];
  }

  const hasCatalog = products.length > 0;

  // Site is in banner-only mode while the Hero redesign is in progress —
  // everything below the banner (besides the "how it works" strip the Hero
  // itself links to) is temporarily hidden.
  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-10 md:px-6 md:pt-16 lg:px-8">
        {hasCatalog ? (
          <HeroFeatured products={products} />
        ) : (
          <div className="overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-14 text-white md:px-12 md:py-20">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--signal)]">
              Lumo Store
            </p>
            <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.05] tracking-[-0.04em] md:text-6xl">
              Карты пополнения
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/60 md:text-lg">
              PlayStation, Steam, App Store, Xbox и другие — код приходит на
              почту сразу после оплаты.
            </p>
          </div>
        )}
      </section>

      <section
        id="steam-topup"
        className="mx-auto mt-10 max-w-7xl scroll-mt-24 px-4 md:mt-14 md:px-6 lg:px-8"
      >
        <SteamTopUp />
      </section>
    </main>
  );
}
