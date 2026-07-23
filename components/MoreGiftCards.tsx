"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Placeholder brand cards (no denomination) that link to their catalog page —
// paper/ink card treatment matching the reference "more gift cards" carousel.
// Real inventory per type wires up later; the row is brand navigation and
// always renders.
type GiftCard = {
  type: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

const CARDS: GiftCard[] = [
  {
    type: "ps-account",
    title: "Аккаунты PlayStation",
    subtitle: "Турция, Индия, США и другие",
    image: "/banners/ps-accounts.png",
    href: "/catalog/ps-accounts",
  },
  {
    type: "xbox",
    title: "Xbox Gift Cards",
    subtitle: "США, Турция и другие",
    image: "/banners/xbox.png",
    href: "/catalog/xbox",
  },
  {
    type: "nintendo",
    title: "Nintendo eShop",
    subtitle: "США, Япония, Европа",
    image: "/banners/nintendo.png",
    href: "/catalog/nintendo",
  },
  {
    type: "apple",
    title: "App Store & iTunes",
    subtitle: "США, UK и другие",
    image: "/banners/apple.png",
    href: "/catalog/apple",
  },
  {
    type: "telegram",
    title: "Telegram Stars",
    subtitle: "Звёзды для Telegram",
    image: "/banners/telegram-stars.png",
    href: "/telegram/stars",
  },
];

function ArrowIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MoreGiftCards() {
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Arrows only mean something while the row overflows (narrow viewports); on
  // wide screens all four fit and both arrows disable.
  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  function step(dir: "prev" | "next") {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 260);
    el.scrollBy({ left: dir === "prev" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <div>
      {/* Header row: eyebrow + title left, pager right */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <span className="h-1.5 w-6 rounded-full bg-[var(--signal-strong)]" aria-hidden="true" />
            Каталог
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.02em] text-[var(--ink)] md:text-3xl">
            Другие товары
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step("prev")}
              disabled={!canPrev}
              aria-label="Прокрутить назад"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]/60 transition hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[var(--ink)]/60"
            >
              <ArrowIcon dir="prev" />
            </button>
            <button
              type="button"
              onClick={() => step("next")}
              disabled={!canNext}
              aria-label="Прокрутить вперёд"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]/60 transition hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[var(--ink)]/60"
            >
              <ArrowIcon dir="next" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={sync}
        className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:mt-8 md:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((card) => (
          <Link
            key={card.type}
            href={card.href}
            className="group flex min-w-[220px] shrink-0 basis-0 grow snap-start flex-col rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-3 transition hover:border-[var(--ink)]/30 sm:min-w-[240px]"
          >
            <div className="relative aspect-[5/6] w-full px-1 pt-1">
              <Image
                src={card.image}
                alt=""
                fill
                sizes="(max-width: 640px) 60vw, 260px"
                className="object-contain"
                style={{ filter: "drop-shadow(0 10px 20px rgba(21,19,27,0.16))" }}
              />
            </div>

            <h3 className="mt-2 text-base font-bold text-[var(--ink)]">{card.title}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{card.subtitle}</p>

            <span className="mt-4 inline-flex items-center justify-center rounded-[12px] border border-[var(--line-strong)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] transition group-hover:border-[var(--ink)]">
              Купить
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
