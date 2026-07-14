import HeroCarousel from "@/components/HeroCarousel";
import type { Product } from "@/lib/products/types";

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

export default function HeroFeatured({ products }: { products: Product[] }) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
      <div>
        <p className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <span className="h-1.5 w-6 rounded-full bg-[var(--signal-strong)]" aria-hidden="true" />
          Карты пополнения
        </p>

        <h1 className="mt-5 font-[family-name:var(--font-unbounded)] text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] sm:text-6xl lg:text-7xl">
          Пополняй.
          <br />
          Играй.
          <br />
          <span className="text-[var(--signal-strong)]">Мгновенно.</span>
        </h1>

        <p className="mt-6 max-w-md text-base leading-7 text-[var(--text-muted)] md:text-lg">
          Карты пополнения для PlayStation, Xbox, Steam, Nintendo, App Store и
          многое другое.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#carousel"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
          >
            Смотреть каталог
            <ArrowRightIcon />
          </a>
          <a
            href="#steam-topup"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line-strong)]">
              <PlayIcon />
            </span>
            Пополнить Steam
          </a>
        </div>

      </div>

      <HeroCarousel products={products} />
    </div>
  );
}
