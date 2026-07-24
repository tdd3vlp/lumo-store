import GamesShowcase from "@/components/GamesShowcase";
import Header from "@/components/Header";
import HeroFeatured from "@/components/HeroFeatured";
import MoreGiftCards from "@/components/MoreGiftCards";
import PlayStationGiftCards from "@/components/PlayStationGiftCards";
import SteamTopUp from "@/components/SteamTopUp";
import { HOME_CAROUSEL_SLUGS } from "@/lib/games/catalog";
import { pricedGames } from "@/lib/games/pricing";
import { allowedRegions } from "@/lib/products/brands";
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

  const psRegions = allowedRegions("playstation");
  const psProducts = products.filter(
    (p) => p.productType === "playstation" && (psRegions === null || psRegions.includes(p.region)),
  );

  // Home carousel shows a curated subset (the catalog page lists them all),
  // ordered as in HOME_CAROUSEL_SLUGS.
  const allGames = await pricedGames();
  const gameBySlug = new Map(allGames.map((g) => [g.slug, g]));
  const games = HOME_CAROUSEL_SLUGS.map((slug) => gameBySlug.get(slug)).filter(
    (g): g is NonNullable<typeof g> => g != null,
  );

  // The hero carousel is brand navigation built on static brand cards, so it
  // renders regardless of catalog state — it must never blank out just because
  // no products happen to be published yet.
  return (
    <main className="min-h-screen pb-12 md:pb-16">
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-10 md:px-6 md:pt-16 lg:px-8">
        <HeroFeatured products={products} />
      </section>

      <section
        id="steam-topup"
        className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 md:mt-16 md:px-6 lg:px-8"
      >
        <SteamTopUp />
      </section>

      {psProducts.length > 0 && (
        <section
          id="playstation"
          className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 md:mt-16 md:px-6 lg:px-8"
        >
          <PlayStationGiftCards products={psProducts} variant="teaser" />
        </section>
      )}

      <section
        id="more-cards"
        className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 md:mt-16 md:px-6 lg:px-8"
      >
        <MoreGiftCards />
      </section>

      <section
        id="games"
        className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 md:mt-16 md:px-6 lg:px-8"
      >
        <GamesShowcase games={games} />
      </section>
    </main>
  );
}
