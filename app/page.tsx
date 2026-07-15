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

  // The hero carousel is brand navigation built on static brand cards, so it
  // renders regardless of catalog state — it must never blank out just because
  // no products happen to be published yet.
  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-10 md:px-6 md:pt-16 lg:px-8">
        <HeroFeatured products={products} />
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
