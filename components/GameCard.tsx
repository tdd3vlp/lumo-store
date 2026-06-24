"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore, type StoreRegion } from "@/store/useStore";

type Props = {
  id: number;
  title: string;
  price: string | number | null;
  originalPrice?: number | null;
  image: string;
  platform?: string;
  russianVoice?: boolean;
  russianSubtitles?: boolean;
  englishVoice?: boolean;
  englishSubtitles?: boolean;
  region?: StoreRegion;
};

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "Цена недоступна";
  if (typeof value === "string") return value;
  return `₹${value.toLocaleString("en-IN")}`;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path
        d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="5.25" y="1.75" width="5.5" height="8" rx="2.75" />
      <path d="M3.5 7.75a4.5 4.5 0 0 0 9 0M8 12.25v2M5.75 14.25h4.5" strokeLinecap="round" />
    </svg>
  );
}

function SubtitlesIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
      <path d="M4 7.25h3M9 7.25h3M4 10h5M10.75 10H12" strokeLinecap="round" />
    </svg>
  );
}

function getNumericPrice(value: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

export default function GameCard({
  id,
  title,
  price,
  originalPrice,
  image,
  russianVoice,
  russianSubtitles,
  englishVoice,
  englishSubtitles,
  region = "IN",
}: Props) {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);

  const numericPrice = getNumericPrice(price);
  const priceUnavailable = numericPrice === null;
  const isFavorite = favorites.includes(id);
  const isInCart = cart.some(
    (item) => item.id === id && (item.region ?? "IN") === region,
  );
  const hasDiscount =
    numericPrice !== null &&
    originalPrice !== null &&
    originalPrice !== undefined &&
    originalPrice > numericPrice;
  const discount =
    hasDiscount && originalPrice
      ? Math.round((1 - numericPrice / originalPrice) * 100)
      : null;
  const handleAddToCart = () => {
    if (numericPrice === null) return;
    addToCart({ id, region, title, price: numericPrice, image });
  };

  return (
    <article className="game-card group relative flex w-[244px] shrink-0 flex-col overflow-hidden rounded-[17px] border border-[var(--line-strong)] bg-[var(--card-surface)] tracking-[-0.018em] sm:w-[268px] md:w-[292px] lg:w-[312px] xl:w-[320px]">
      <div className="relative">
        <Link
          href={`/game/${id}`}
          className="relative block aspect-square overflow-hidden bg-[#d7d1c7] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--signal)]"
          aria-label={`Открыть ${title}`}
        >
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 244px, (max-width: 768px) 268px, (max-width: 1024px) 292px, (max-width: 1280px) 312px, 320px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
          />
          <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
        </Link>

        {discount !== null && (
          <span className="absolute left-2.5 top-2.5 z-10 inline-flex h-8 items-center justify-center rounded-[7px] border border-black/10 bg-[var(--coral)] px-2.5 pt-px text-[14px] font-extrabold leading-none text-white shadow-[0_2px_0_rgba(0,0,0,0.18)]">
            −{discount}%
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleFavorite(id)}
          className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_2px_0_rgba(0,0,0,0.16)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] ${
            isFavorite
              ? "border-[var(--coral)] bg-[var(--coral)] text-white"
              : "border-black/20 bg-[var(--paper-strong)]/95 text-[var(--ink)] hover:bg-white"
          }`}
          aria-label={
            isFavorite
              ? `Убрать ${title} из избранного`
              : `Добавить ${title} в избранное`
          }
          aria-pressed={isFavorite}
        >
          <HeartIcon filled={isFavorite} />
        </button>

        {!priceUnavailable && (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-[12px] border shadow-[0_2px_0_rgba(0,0,0,0.18)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] ${
              isInCart
                ? "border-[var(--signal)] bg-[var(--ink)] text-[var(--signal)]"
                : "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
            }`}
            aria-label={
              isInCart
                ? `Добавить ещё одну копию ${title} в корзину`
                : `Добавить ${title} в корзину`
            }
          >
            <CartIcon />
          </button>
        )}
      </div>

      <div className="flex min-h-[124px] flex-1 flex-col px-3 pb-3.5 pt-2.5">
        <div className="mb-2.5 flex min-h-7 items-center justify-end gap-1.5">
          {russianVoice && (
            <span
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--ink)]/14 bg-[var(--ink)] px-2.5 pt-px text-xs font-extrabold leading-none text-[var(--signal)]"
              aria-label="Русская озвучка"
              title="Русская озвучка"
            >
              <span>RU</span>
              <MicrophoneIcon />
            </span>
          )}
          {russianSubtitles && (
            <span
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line)] bg-[var(--paper)] px-2.5 pt-px text-xs font-extrabold leading-none text-[var(--text-muted)]"
              aria-label="Русские субтитры"
              title="Русские субтитры"
            >
              <span>RU</span>
              <SubtitlesIcon />
            </span>
          )}
          {!russianVoice && !russianSubtitles && englishVoice && (
            <span
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--ink)]/14 bg-[var(--ink)] px-2.5 pt-px text-xs font-extrabold leading-none text-white"
              aria-label="Английская озвучка"
              title="Английская озвучка"
            >
              <span>EN</span>
              <MicrophoneIcon />
            </span>
          )}
          {!russianVoice && !russianSubtitles && englishSubtitles && (
            <span
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line)] bg-[var(--paper)] px-2.5 pt-px text-xs font-extrabold leading-none text-[var(--text-muted)]"
              aria-label="Английские субтитры"
              title="Английские субтитры"
            >
              <span>EN</span>
              <SubtitlesIcon />
            </span>
          )}
          {!russianVoice &&
            !russianSubtitles &&
            !englishVoice &&
            !englishSubtitles && (
            <>
              <span className="sr-only">Данные о языке не указаны</span>
            </>
          )}
        </div>

        <Link
          href={`/game/${id}`}
          className="line-clamp-2 h-[44px] text-[16px] font-semibold leading-[1.3] tracking-[-0.03em] text-[var(--text)] transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)] sm:h-[46px] sm:text-[17px]"
        >
          {title}
        </Link>

        <div className="mt-3 flex min-h-6 flex-wrap items-baseline gap-x-2">
          {priceUnavailable ? (
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Цена недоступна
            </span>
          ) : (
            <>
              <span className="text-[20px] font-extrabold leading-none tracking-[-0.045em] text-[var(--ink)] sm:text-[22px]">
                {formatPrice(numericPrice)}
              </span>
              {hasDiscount && (
                <span className="text-[15px] font-medium leading-none text-[#948e98] line-through sm:text-[16px]">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
