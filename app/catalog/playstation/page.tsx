import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import PlayStationActivationGuide from "@/components/PlayStationActivationGuide";
import PlayStationGiftCards from "@/components/PlayStationGiftCards";
import { allowedRegions } from "@/lib/products/brands";
import { getPublishedProducts } from "@/lib/products/storefront";
import type { Product } from "@/lib/products/types";

export const dynamic = "force-dynamic";

export default async function PlayStationCatalogPage() {
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
  if (psProducts.length === 0) notFound();

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
          <span>PlayStation</span>
        </nav>

        <PlayStationGiftCards products={psProducts} />
        <PlayStationActivationGuide />
      </main>
    </>
  );
}
