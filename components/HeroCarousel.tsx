"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/products/types";

type FeaturedItem = {
  type: string;
  label: string;
  image: string;
};

// PlayStation sits in the middle so it's the default centered card — the fan
// then spreads two brands to either side, matching the reference composition.
const FEATURED: FeaturedItem[] = [
  { type: "steam", label: "Steam", image: "/banners/steam.png" },
  { type: "apple", label: "App Store", image: "/banners/apple.png" },
  { type: "playstation", label: "PlayStation", image: "/banners/playstation.png" },
  { type: "xbox", label: "Xbox", image: "/banners/xbox.png" },
  { type: "nintendo", label: "Nintendo eShop", image: "/banners/nintendo.png" },
];

const CARD_SHADOW = "drop-shadow(0 14px 24px rgba(21,19,27,0.2))";
const AUTOPLAY_MS = 3500;

// Shortest signed distance from `active` to `i` around a ring of `n` cards, so
// the fan wraps: with 5 cards every card lands on a unique slot (-2…+2).
function circularOffset(i: number, active: number, n: number): number {
  let offset = ((i - active) % n + n) % n;
  if (offset > Math.floor(n / 2)) offset -= n;
  return offset;
}

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeroCarousel({ products }: { products: Product[] }) {
  const available = new Set(products.map((p) => p.productType));
  const items = FEATURED.filter((item) => available.has(item.type));
  const cards = items.length > 0 ? items : FEATURED;
  const n = cards.length;

  const [active, setActive] = useState(() => Math.floor((n - 1) / 2));
  const [paused, setPaused] = useState(false);

  // Each step, exactly one card teleports across the ring (far-left ↔ far-right).
  // We suppress its slide transition so it snaps at the back instead of gliding
  // across the whole stage. Derived during render (React's "adjust state while
  // rendering" pattern) so the committed DOM already has the right transition —
  // an effect would fire a frame too late and the wrong slide would flash.
  const [prevActive, setPrevActive] = useState(active);
  const [snapIndex, setSnapIndex] = useState<number | null>(null);

  if (prevActive !== active) {
    let wrapped: number | null = null;
    for (let i = 0; i < n; i++) {
      if (Math.abs(circularOffset(i, active, n) - circularOffset(i, prevActive, n)) > 1) {
        wrapped = i;
        break;
      }
    }
    setSnapIndex(wrapped);
    setPrevActive(active);
  }

  function go(delta: number) {
    setActive((i) => ((i + delta) % n + n) % n);
  }

  // Auto-advance leftwards: the right-hand card rotates into the centre. Resets
  // on every change (manual or automatic) so a manual pick gets a full dwell.
  useEffect(() => {
    if (paused) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setActive((i) => (i + 1) % n), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, active, n]);

  return (
    <div
      id="carousel"
      // Clip the fan to the viewport on small screens: the perspective stage
      // below can't reliably clip its own 3D-transformed cards (they escape
      // overflow-hidden), so the edge cards would push the page wider. From xl
      // the fan has room to show in full.
      className="w-full scroll-mt-24 overflow-x-clip xl:overflow-x-visible"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative">
        <div
          className="relative mx-auto h-[230px] w-full overflow-hidden sm:h-[280px] md:h-[320px] lg:h-[350px] xl:overflow-visible"
          style={{ perspective: 1600 }}
        >
          {cards.map((item, i) => {
            const offset = circularOffset(i, active, n);
            const abs = Math.abs(offset);
            const isActive = offset === 0;
            const translateX = offset * 118;
            const rotateY = offset === 0 ? 0 : offset > 0 ? -32 : 32;
            const scale = isActive ? 1 : Math.max(0.68, 0.88 - (abs - 1) * 0.1);
            const wrapped = i === snapIndex;

            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setActive(i)}
                aria-label={item.label}
                aria-current={isActive}
                className="absolute left-1/2 top-1/2 aspect-[3/4] w-[160px] ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[200px] md:w-[230px] lg:w-[250px]"
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}px) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex: 100 - abs,
                  transitionProperty: "transform",
                  transitionDuration: wrapped ? "0ms" : "500ms",
                }}
              >
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  sizes="250px"
                  className="object-contain"
                  style={{ filter: CARD_SHADOW }}
                  priority={isActive}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Предыдущая карта"
          className="absolute left-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white text-[var(--ink)]/70 shadow-md transition hover:text-[var(--ink)]"
        >
          <ArrowIcon direction="prev" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Следующая карта"
          className="absolute right-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white text-[var(--ink)]/70 shadow-md transition hover:text-[var(--ink)]"
        >
          <ArrowIcon direction="next" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {cards.map((item, i) => (
          <button
            key={item.type}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Показать ${item.label}`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-5 bg-[var(--signal-strong)]" : "w-1.5 bg-[var(--line-strong)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
