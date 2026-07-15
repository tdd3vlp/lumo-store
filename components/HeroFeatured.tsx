import BrandIcon from "@/components/BrandIcon";
import HeroCarousel from "@/components/HeroCarousel";
import type { Product } from "@/lib/products/types";

// Each service jumps to its on-page block when one exists (#playstation,
// #steam-topup); the rest fall back to their catalog page until a block is built.
const SERVICES: Array<{ type: string; label: string; href: string }> = [
  { type: "playstation", label: "PlayStation", href: "#playstation" },
  { type: "xbox", label: "Xbox", href: "/catalog/xbox" },
  { type: "steam", label: "Steam", href: "#steam-topup" },
  { type: "nintendo", label: "Nintendo", href: "/catalog/nintendo" },
  { type: "apple", label: "App Store", href: "/catalog/apple" },
];

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

        {/* Catalog quick-nav: pick a service to jump to its block */}
        <div className="mt-8">
          <p className="text-sm font-bold text-[var(--ink)]">Смотреть каталог</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-2">
            {SERVICES.map((s) => (
              <a
                key={s.type}
                href={s.href}
                className="inline-flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--card-surface)]"
              >
                <BrandIcon type={s.type} />
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <HeroCarousel products={products} />
    </div>
  );
}
