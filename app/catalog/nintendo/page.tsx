import Link from "next/link";
import Header from "@/components/Header";
import NintendoActivationGuide from "@/components/NintendoActivationGuide";
import NintendoCatalog from "@/components/NintendoCatalog";
import { pricedNintendoProducts } from "@/lib/products/nintendo-catalog-quote";

export const dynamic = "force-dynamic";

export const metadata = { title: "Nintendo eShop — Lumo" };

export default async function NintendoCatalogPage() {
  const products = await pricedNintendoProducts();

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
          <span>Nintendo</span>
        </nav>

        <NintendoCatalog products={products} />
        <NintendoActivationGuide />
      </main>
    </>
  );
}
