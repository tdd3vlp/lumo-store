import BrandIcon from "@/components/BrandIcon";
import HeroCarousel from "@/components/HeroCarousel";
import type { Product } from "@/lib/products/types";

// Compact panel: PlayStation, Xbox and App Store open their own pages,
// Steam anchors to its on-page block, and "Другое" jumps to the "Другие товары"
// row (#more-cards) that holds everything else.
const SERVICES: Array<{ type: string; label: string; href: string }> = [
  { type: "playstation", label: "PlayStation", href: "/catalog/playstation" },
  { type: "xbox", label: "Xbox", href: "/catalog/xbox" },
  { type: "steam", label: "Steam", href: "#steam-topup" },
  { type: "apple", label: "App Store", href: "/catalog/apple" },
  { type: "all", label: "Другое", href: "#more-cards" },
];

export default function HeroFeatured({ products }: { products: Product[] }) {
  return (
    <div>
      {/* Headline + carousel. Two columns only from xl, where the fan has room;
          below that they stack so the cards never overlap the headline. */}
      <div className="grid items-center gap-10 xl:grid-cols-2 xl:gap-16">
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
        </div>

        <HeroCarousel products={products} />
      </div>

      {/* Full-width service picker under the headline + carousel. Each service
          is a tappable outlined chip — the border and chevron signal that it
          navigates, so no separate "choose a service" label is needed. */}
      <div className="mt-10 flex flex-wrap items-stretch gap-2 md:mt-12">
        {SERVICES.map((s) => (
          <a
            key={s.type}
            href={s.href}
            className="group inline-flex flex-1 basis-[130px] items-center justify-center gap-2 rounded-[14px] border border-[var(--line)] px-4 py-3.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--ink)]/45"
          >
            <BrandIcon type={s.type} />
            {s.label}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--ink)]"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
