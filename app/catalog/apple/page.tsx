import Link from "next/link";
import AppleActivationGuide from "@/components/AppleActivationGuide";
import AppleCatalog from "@/components/AppleCatalog";
import Header from "@/components/Header";
import { pricedAppleProducts } from "@/lib/products/apple-catalog-quote";

export const dynamic = "force-dynamic";

export const metadata = { title: "App Store & iTunes — Lumo" };

export default async function AppleCatalogPage() {
  const products = await pricedAppleProducts();

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
          <span>App Store &amp; iTunes</span>
        </nav>

        <AppleCatalog products={products} />
        <AppleActivationGuide />
      </main>
    </>
  );
}
