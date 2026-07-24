"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import type { Game } from "@/data/mockGames";
import { inferEditionName } from "@/lib/catalog/editions";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import { editionCartId, useStore } from "@/store/useStore";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
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
      className="h-5 w-5"
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

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatReleaseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatSaleEndDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function GamePageClient({ game }: { game: Game }) {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const tryRate = useRegionRate("TR");

  const [selectedEditionId, setSelectedEditionId] = useState(
    // Select the edition matching the current product's stableId (the URL we navigated to),
    // falling back to first edition if only one exists or match not found.
    game.editions.find((e) => e.id === String(game.id))?.id ??
      game?.editions[0]?.id ??
      "",
  );
  const [screenshots, setScreenshots] = useState<string[]>(
    game?.screenshots ?? [],
  );
  const [screenshotsLoading, setScreenshotsLoading] = useState(
    (game?.screenshots.length ?? 0) === 0,
  );
  const screenshotsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!game || game.screenshots.length > 0) return;

    let active = true;

    fetch(`/api/game-media?id=${game.id}`)
      .then((response) => response.json())
      .then((result: { screenshots?: string[] }) => {
        if (active && Array.isArray(result.screenshots)) {
          setScreenshots(result.screenshots);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setScreenshotsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [game]);

  const selectedEdition =
    game.editions.find((edition) => edition.id === selectedEditionId) ??
    game.editions[0];
  const displayedEditions = game.editions.map((edition) => ({
    ...edition,
    name:
      game.editions.length === 1
        ? inferEditionName(game.title)
        : edition.name,
  }));
  const displayedSelectedEdition =
    displayedEditions.find((edition) => edition.id === selectedEdition.id) ??
    displayedEditions[0];
  const selectedEditionIndex = game.editions.findIndex(
    (edition) => edition.id === selectedEdition.id,
  );
  const cartItemId = editionCartId(game.id, selectedEditionIndex);
  const gameRegion = game.region ?? "TR";
  const cartItem = cart.find(
    (item) =>
      item.id === cartItemId && (item.region ?? "TR") === gameRegion,
  );
  const quantity = cartItem?.quantity ?? 0;
  const isFavorite = favorites.includes(game.id);
  const discount =
    selectedEdition.price != null && selectedEdition.originalPrice != null
      ? Math.round((1 - selectedEdition.price / selectedEdition.originalPrice) * 100)
      : 0;
  const saleEndLabel = formatSaleEndDate(game.saleEndDate);
  const languageLabel =
    game.russianVoice && game.russianSubtitles
      ? "Озвучка и субтитры"
      : game.russianVoice
        ? "Озвучка"
        : game.russianSubtitles
          ? "Субтитры"
          : "Отсутствует";
  const platformLabel =
    game.platform === "PS4" ? "PS4, можно играть на PS5" : game.platform;

  const scrollScreenshots = (direction: "left" | "right") => {
    const gallery = screenshotsRef.current;
    if (!gallery) return;

    gallery.scrollBy({
      left:
        direction === "left"
          ? -Math.round(gallery.clientWidth * 0.72)
          : Math.round(gallery.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  const addSelectedEdition = () =>
    addToCart({
      id: cartItemId,
      gameId: game.id,
      region: gameRegion,
      title: game.title,
      edition: displayedSelectedEdition.name,
      price: selectedEdition.price,
      originalPrice: selectedEdition.originalPrice,
      image: game.image,
    });

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-5 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex min-w-0 items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link
            href="/"
            className="shrink-0 font-semibold transition hover:text-[var(--ink)]"
          >
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate">{game.title}</span>
        </nav>

        <section className="relative overflow-hidden rounded-[24px] bg-[var(--ink)] text-white">
          <div
            className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full bg-[var(--signal)]/[0.07] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative grid gap-7 p-4 sm:p-6 md:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] md:p-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10 lg:p-10 pb-6 md:pb-7 lg:pb-8">
            <div className="relative mx-auto aspect-[7/8] w-full max-w-[380px] overflow-hidden rounded-[18px] border-2 border-[var(--signal)] bg-[var(--ink-soft)]">
              <Image
                src={game.image}
                alt={game.title}
                fill
                priority
                sizes="(max-width: 767px) 90vw, 340px"
                className="object-cover"
              />
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {game.isPreorder && (
                  <span className="inline-flex h-7 items-center rounded-[7px] bg-[var(--signal)] px-2.5 text-xs font-extrabold text-[var(--ink)]">
                    Предзаказ
                  </span>
                )}
                {game.rating !== null && (
                  <span className="inline-flex h-7 items-center rounded-[7px] border border-white/18 bg-white/[0.06] px-2.5 text-xs font-bold text-[var(--signal)]">
                    ★ {game.rating.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="max-w-[850px] font-[family-name:var(--font-unbounded)] text-[clamp(1.75rem,4vw,3.65rem)] font-bold leading-[1.02] tracking-[-0.045em] text-[var(--paper-strong)]">
                {game.title}
              </h1>

              {game.summaryRu && (
                <p className="mt-3 max-w-[580px] text-[15px] leading-[1.65] text-white/62">
                  {game.summaryRu}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="font-[family-name:var(--font-unbounded)] text-3xl font-bold leading-none text-[var(--signal)] md:text-4xl">
                  {selectedEdition.price != null ? formatPriceAsRubles(selectedEdition.price, tryRate) : "Цена при выходе"}
                </span>
                {selectedEdition.price != null && selectedEdition.originalPrice != null && selectedEdition.originalPrice > selectedEdition.price && (
                  <>
                    <span className="text-lg font-medium leading-none text-white/42 line-through md:text-xl">
                      {selectedEdition.originalPrice != null ? formatPriceAsRubles(selectedEdition.originalPrice, tryRate) : ""}
                    </span>
                    <span className="rounded-[7px] bg-[var(--coral)] px-2.5 py-1 text-sm font-extrabold leading-none text-white">
                      −{discount}%
                    </span>
                  </>
                )}
              </div>

              {game.isPreorder && game.releaseDate && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/70">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-[var(--signal)]" aria-hidden="true">
                    <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M7 2v3M13 2v3M3 8h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  Выходит {game.releaseDate}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-stretch gap-3 md:mt-auto md:pt-6">
                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={addSelectedEdition}
                    className="inline-flex min-h-14 flex-1 items-center justify-center gap-2.5 rounded-[14px] border border-[var(--signal)] bg-[var(--signal)] px-5 text-base font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] sm:max-w-[310px]"
                  >
                    <CartIcon />
                    Добавить в корзину
                  </button>
                ) : (
                  <div className="flex min-h-14 flex-1 items-center gap-2 sm:max-w-[310px]">
                    <button
                      type="button"
                      onClick={() => decreaseCartItem(cartItemId, gameRegion)}
                      className="h-14 w-14 rounded-[14px] border border-white/20 bg-white/[0.06] text-2xl font-medium transition hover:bg-white/[0.1]"
                      aria-label="Уменьшить количество"
                    >
                      −
                    </button>
                    <Link
                      href="/cart"
                      className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--signal)] font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                      aria-label="Перейти в корзину"
                    >
                      <CartIcon />
                      {quantity}
                    </Link>
                    <button
                      type="button"
                      onClick={addSelectedEdition}
                      className="h-14 w-14 rounded-[14px] border border-white/20 bg-white/[0.06] text-2xl font-medium transition hover:bg-white/[0.1]"
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleFavorite(game.id)}
                  className={`flex h-14 w-14 items-center justify-center rounded-[14px] border transition ${
                    isFavorite
                      ? "border-[var(--coral)] bg-[var(--coral)] text-white"
                      : "border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                  }`}
                  aria-label={
                    isFavorite
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                  aria-pressed={isFavorite}
                >
                  <HeartIcon filled={isFavorite} />
                </button>
                {saleEndLabel && selectedEdition.price != null && selectedEdition.originalPrice != null && selectedEdition.originalPrice > selectedEdition.price && (
                  <div className="flex min-h-14 min-w-[210px] flex-col justify-center rounded-[14px] border border-white/18 bg-white/[0.06] px-4 text-sm">
                    <span className="font-semibold text-white/52">
                      Скидка действует до:
                    </span>
                    <span className="mt-0.5 font-extrabold text-[var(--signal)]">
                      {saleEndLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {game.editions.length > 1 && (
            <div className="border-t border-white/[0.09] px-4 pb-6 pt-5 sm:px-6 md:px-8 lg:px-10">
              <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">
                Выберите издание
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {displayedEditions.map((edition) => {
                  const isActive = edition.id === selectedEdition.id;
                  const editionLabel = edition.label ?? inferEditionName(edition.name);
                  const edDiscount =
                    edition.price != null && edition.originalPrice != null && edition.originalPrice > edition.price
                      ? Math.round((1 - edition.price / edition.originalPrice) * 100)
                      : null;
                  return (
                    <button
                      key={edition.id}
                      type="button"
                      onClick={() => setSelectedEditionId(edition.id)}
                      className={`group flex w-[220px] shrink-0 items-stretch overflow-hidden rounded-[16px] border text-left transition sm:w-[240px] ${
                        isActive
                          ? "border-[var(--signal)] bg-white/[0.08]"
                          : "border-white/[0.1] bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="relative w-[76px] shrink-0 overflow-hidden bg-[var(--ink-soft)]">
                        <Image
                          src={edition.image ?? game.image}
                          alt=""
                          fill
                          sizes="76px"
                          className="object-cover transition duration-300 group-hover:scale-[1.04]"
                        />
                        {isActive && (
                          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--ink)] text-[10px] font-extrabold">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between p-3">
                        <p className={`text-[13px] font-bold leading-[1.3] ${isActive ? "text-white" : "text-white/65 group-hover:text-white/85"}`}>
                          {editionLabel}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {edDiscount !== null && (
                            <span className="rounded-[5px] bg-[var(--coral)] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                              −{edDiscount}%
                            </span>
                          )}
                          <span className={`text-sm font-extrabold leading-none ${isActive ? "text-[var(--signal)]" : "text-white/50"}`}>
                            {edition.price != null
                              ? formatPriceAsRubles(edition.price, tryRate)
                              : "Цена при выходе"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section className="rounded-[20px] border border-[var(--line)] bg-[var(--card-surface)] p-5 md:p-7">
            <h2 className="text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]">
              Об игре
            </h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[var(--text-muted)] md:text-base">
              {game.description.replaceAll(" _ ", "\n").replaceAll("...", "…")}
            </p>
            {game.psStoreUrl && (
              <a
                href={game.psStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-fit items-center text-sm font-bold text-[var(--ink)] underline decoration-[var(--line-strong)] decoration-1 underline-offset-4 transition hover:decoration-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal-strong)]"
              >
                Посмотреть в PS Store
              </a>
            )}
          </section>

          <div className="space-y-6">
            <section className="grid gap-px overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--line)]">
              {[
                ["Платформа", platformLabel],
                ["Русский язык", languageLabel],
                ["Дата выхода", formatReleaseDate(game.releaseDate)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 bg-[var(--card-surface)] px-5 py-4"
                >
                  <span className="text-sm text-[var(--text-muted)]">
                    {label}
                  </span>
                  <span className="text-right text-sm font-bold text-[var(--ink)]">
                    {value}
                  </span>
                </div>
              ))}
            </section>
          </div>
        </div>

        {!game.isPreorder && (screenshotsLoading || screenshots.length > 0) && <section className="mt-9">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Галерея
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[var(--ink)] md:text-3xl">
                Скриншоты
              </h2>
            </div>
            {screenshots.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="mr-1 hidden text-sm font-semibold text-[var(--text-muted)] sm:inline">
                  {screenshots.length} изображений
                </span>
                <button
                  type="button"
                  onClick={() => scrollScreenshots("left")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--card-surface)] text-[var(--ink)] transition hover:border-[var(--line-strong)] hover:bg-[var(--paper-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)]"
                  aria-label="Предыдущие скриншоты"
                >
                  <ChevronIcon direction="left" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollScreenshots("right")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ink)] bg-[var(--ink)] text-[var(--signal)] transition hover:bg-[var(--ink-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)]"
                  aria-label="Следующие скриншоты"
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>
            )}
          </div>

          {screenshotsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="aspect-video animate-pulse rounded-[18px] bg-[var(--line)]"
                />
              ))}
            </div>
          ) : screenshots.length > 0 ? (
            <div
              ref={screenshotsRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {screenshots.map((screenshot, index) => (
                <div
                  key={screenshot}
                  className="relative aspect-video w-[88%] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[var(--line-strong)] bg-[var(--ink)] sm:w-[72%] lg:w-[56%]"
                >
                  <Image
                    src={screenshot}
                    alt={`${game.title}, скриншот ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 88vw, (max-width: 1024px) 72vw, 700px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--card-surface)] px-5 py-10 text-center text-sm font-semibold text-[var(--text-muted)]">
              Для этой игры PlayStation Store пока не вернул изображения галереи.
            </div>
          )}
        </section>}
      </main>
    </>
  );
}
