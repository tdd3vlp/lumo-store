"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { psnDeals } from "@/data/psnDeals";
import {
  recommendGiftCards,
  type GiftCardOption,
} from "@/lib/gift-cards/recommendation";
import {
  formatRegionalAmount,
  formatRubles,
  REGION_CONFIG,
} from "@/lib/gift-cards/regions";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import { useStore, type StoreRegion } from "@/store/useStore";

type CatalogDenomination = GiftCardOption & {
  region: StoreRegion;
};

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 5h2l2 10h9l2-7H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6.5 7l1 14h9l1-14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GiftCardVisual({
  region,
  amount,
}: {
  region: StoreRegion;
  amount: number;
}) {
  const config = REGION_CONFIG[region];

  return (
    <div className="relative aspect-[5/7] w-[112px] shrink-0 overflow-hidden rounded-[16px] border border-white/20 bg-[var(--ink-soft)] text-white sm:w-[132px]">
      <div className="absolute -right-12 -top-9 h-32 w-32 rotate-12 rounded-[28px] border-[18px] border-[var(--signal)]/12" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-[var(--signal)]/10" />
      <div className="relative flex h-full flex-col justify-between p-3.5">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/50">
            Карта пополнения
          </p>
          <p className="mt-1 text-xs font-bold">{config.currency}</p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-unbounded)] text-[20px] font-bold leading-none text-[var(--signal)]">
            {formatRegionalAmount(region, amount)}
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
            PlayStation Store
          </p>
        </div>
      </div>
    </div>
  );
}

function getFallbackCatalog(): CatalogDenomination[] {
  return Object.values(REGION_CONFIG).flatMap((region) =>
    region.denominations.map((amount) => ({
      id: `${region.code}-${amount}`,
      region: region.code,
      amount,
      salePriceMinor: null,
    })),
  );
}

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const activeRegion = useStore((state) => state.selectedRegion);

  const activeRate = useRegionRate(activeRegion);

  function fmtGamePrice(amount: number | null): string {
    if (amount === null) return "Цена недоступна";
    return formatPriceAsRubles(amount, activeRate);
  }
  const [catalog, setCatalog] = useState<CatalogDenomination[]>(
    getFallbackCatalog,
  );

  useEffect(() => {
    let active = true;

    fetch("/api/gift-cards/catalog")
      .then((response) => response.json())
      .then((result: { denominations?: CatalogDenomination[] }) => {
        if (active && Array.isArray(result.denominations)) {
          setCatalog(result.denominations);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const regionCart = useMemo(
    () =>
      cart.filter((item) => (item.region ?? "TR") === activeRegion),
    [activeRegion, cart],
  );
  const total = useMemo(
    () =>
      Math.round(
        regionCart.reduce(
          (sum, item) => sum + (item.price ?? 0) * item.quantity,
          0,
        ),
      ),
    [regionCart],
  );
  const regionOptions = useMemo(
    () =>
      catalog
        .filter((item) => item.region === activeRegion)
        .map(({ id, amount, salePriceMinor }) => ({
          id,
          amount,
          salePriceMinor,
        })),
    [activeRegion, catalog],
  );
  const recommendation = useMemo(
    () => recommendGiftCards(total, regionOptions),
    [regionOptions, total],
  );
  const cartGameIds = useMemo(
    () => new Set(regionCart.map((item) => item.gameId ?? item.id)),
    [regionCart],
  );
  const suggestedGames = useMemo(() => {
    if (!recommendation || recommendation.remainder <= 0) return [];

    return psnDeals
      .filter(
        (game) =>
          game.price != null && game.price <= recommendation.remainder && !cartGameIds.has(game.id),
      )
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      .slice(0, 4);
  }, [cartGameIds, recommendation]);
  const config = REGION_CONFIG[activeRegion];

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
          <span>Корзина</span>
        </nav>

        <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Покупка через карту пополнения
            </p>
            <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
              Корзина
            </h1>
          </div>

          {regionCart.length > 0 && (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--ink)] px-2.5 text-sm font-extrabold text-[var(--signal)]">
              {regionCart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </div>

        {regionCart.length === 0 ? (
          <section className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-7 md:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--ink)] text-[var(--signal)]">
              <CartIcon />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-[var(--ink)]">
              Корзина пока пуста
            </h2>
            <p className="mt-2 max-w-xl text-[var(--text-muted)]">
              Добавь игры из каталога, чтобы подобрать карту пополнения.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)]"
            >
              Выбрать игры
            </Link>
          </section>
        ) : (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-[24px] bg-[var(--ink)] text-white">
              <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-9">
                <div>
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--signal)]">
                        Подходящие карты пополнения
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        Баланс для оплаты игр
                      </h2>
                    </div>
                    {recommendation && (
                      <p className="font-[family-name:var(--font-unbounded)] text-xl font-bold text-[var(--signal)] sm:text-2xl">
                        {formatRegionalAmount(activeRegion, recommendation.balance)}
                      </p>
                    )}
                  </div>

                  {recommendation ? (
                    <div className="space-y-4">
                      {recommendation.cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center gap-4 rounded-[18px] border border-white/14 bg-white/[0.055] p-3 sm:gap-6 sm:p-4"
                        >
                          <GiftCardVisual
                            region={activeRegion}
                            amount={card.amount}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/48">Стоимость карты</p>
                            <p className="mt-1 text-xl font-extrabold sm:text-2xl">
                              {formatRubles(
                                card.salePriceMinor === null
                                  ? null
                                  : card.salePriceMinor * card.quantity,
                              )}
                            </p>
                            <p className="mt-3 text-sm text-white/55">
                              Номинал{" "}
                              <strong className="text-white">
                                {formatRegionalAmount(activeRegion, card.amount)}
                              </strong>
                              {card.quantity > 1 && ` × ${card.quantity}`}
                            </p>
                          </div>
                          <span className="flex h-12 min-w-12 items-center justify-center rounded-[13px] bg-white/8 px-3 font-bold text-[var(--signal)]">
                            {card.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-[var(--coral)]/35 bg-[var(--coral)]/10 p-5 text-white/76">
                      Номиналы для региона «{config.name}» ещё не настроены.
                      После добавления в панели управления подбор заработает
                      автоматически.
                    </div>
                  )}
                </div>

                <aside className="h-fit rounded-[20px] bg-[var(--paper-strong)] p-5 text-[var(--ink)] sm:p-6">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    К оплате
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em]">
                    {recommendation
                      ? formatRubles(recommendation.salePriceMinor)
                      : "—"}
                  </p>
                  <dl className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-muted)]">Стоимость игры</dt>
                      <dd className="font-bold">
                        {formatRegionalAmount(activeRegion, total)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-muted)]">Баланс карты</dt>
                      <dd className="font-bold">
                        {recommendation
                          ? formatRegionalAmount(
                              activeRegion,
                              recommendation.balance,
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--text-muted)]">Останется на аккаунте</dt>
                      <dd className="font-extrabold text-[#527000]">
                        {recommendation
                          ? formatRegionalAmount(
                              activeRegion,
                              recommendation.remainder,
                            )
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    disabled={!recommendation || recommendation.salePriceMinor === null}
                    className="mt-6 w-full rounded-[13px] bg-[var(--signal)] px-5 py-4 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:cursor-not-allowed disabled:bg-[#d9d5ca] disabled:text-[var(--text-muted)]"
                  >
                    {recommendation?.salePriceMinor === null
                      ? "Цена карты настраивается"
                      : "Перейти к оформлению"}
                  </button>
                </aside>
              </div>

              <details className="group border-t border-white/12 px-5 py-5 sm:px-7 lg:px-9">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white/82">
                  <span>Как работают карты пополнения?</span>
                  <span className="text-xl text-[var(--signal)] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-white/55">
                  Вы покупаете код фиксированного номинала, активируете его в
                  аккаунте PlayStation нужного региона и оплачиваете выбранные
                  игры с внутреннего баланса. Неиспользованная сумма остаётся на
                  аккаунте.
                </p>
              </details>
            </section>

            {recommendation && (
              <div className="flex items-start gap-3 rounded-[18px] border border-[#91ad23]/35 bg-[var(--signal)]/18 px-5 py-4 text-sm font-bold text-[var(--ink)] sm:text-base">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#527000] text-white text-[10px]">✓</span>
                <span>
                  Вы покупаете карты на {formatRegionalAmount(activeRegion, recommendation.balance)}.{" "}
                  Этого хватит для оплаты выбранных игр в PS Store.
                </span>
              </div>
            )}

            <section>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl font-bold text-[var(--ink)]">
                      Выбранные товары
                    </h2>
                    <span className="text-xl font-extrabold text-[var(--ink)]">
                      {formatRegionalAmount(activeRegion, total)}
                    </span>
                  </div>
                  {recommendation && recommendation.remainder > 0 && (
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {formatRegionalAmount(activeRegion, recommendation.remainder)} останется на вашем аккаунте
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => clearCart(activeRegion)}
                  className="mt-1 rounded-[12px] border border-[var(--line-strong)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
                >
                  Очистить
                </button>
              </div>

              <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {regionCart.map((item) => (
                  <article
                    key={`${activeRegion}-${item.id}`}
                    className="flex gap-4 py-5 sm:items-center sm:gap-6"
                  >
                    <div className="relative h-[126px] w-[94px] shrink-0 overflow-hidden rounded-[14px] bg-[#d7d1c7] sm:h-[146px] sm:w-[108px]">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="108px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/game/${item.gameId ?? item.id}`}
                        className="line-clamp-2 text-lg font-bold text-[var(--ink)] hover:underline sm:text-xl"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                        Цена в PS Store {item.price != null ? formatRegionalAmount(activeRegion, item.price) : "—"}
                      </p>
                      <p className="mt-1 font-extrabold text-[var(--ink)]">
                        {fmtGamePrice(item.price)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.id, activeRegion)}
                          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[var(--line-strong)] text-xl"
                          aria-label="Уменьшить количество"
                        >
                          −
                        </button>
                        <span className="flex h-10 min-w-14 items-center justify-center rounded-[11px] bg-[var(--card-surface)] px-3 text-sm font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            addToCart({
                              ...item,
                              region: activeRegion,
                            })
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[var(--line-strong)] text-xl"
                          aria-label="Увеличить количество"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id, activeRegion)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[12px] border border-[var(--line)] text-[var(--text-muted)] transition hover:border-[var(--coral)] hover:text-[var(--coral)]"
                      aria-label={`Удалить ${item.title}`}
                    >
                      <TrashIcon />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {recommendation && recommendation.remainder > 0 && (
              <section className="rounded-[24px] bg-[var(--card-surface)] p-5 sm:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Остаток {formatRegionalAmount(activeRegion, recommendation.remainder)}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">
                  Игры, которые поместятся в остаток
                </h2>
                {suggestedGames.length > 0 ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {suggestedGames.map((game) => (
                      <article
                        key={game.id}
                        className="overflow-hidden rounded-[17px] border border-[var(--line-strong)] bg-[var(--paper-strong)]"
                      >
                        <Link
                          href={`/game/${game.id}`}
                          className="relative block aspect-[7/8] overflow-hidden"
                        >
                          <Image
                            src={game.image}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 100vw, 260px"
                            className="object-cover transition duration-500 hover:scale-[1.035]"
                          />
                        </Link>
                        <div className="p-4">
                          <Link
                            href={`/game/${game.id}`}
                            className="line-clamp-2 h-11 font-bold leading-snug hover:underline"
                          >
                            {game.title}
                          </Link>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-lg font-extrabold">
                              {fmtGamePrice(game.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                addToCart({
                                  id: game.id,
                                  region: activeRegion,
                                  title: game.title,
                                  price: game.price,
                                  image: game.image,
                                })
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--ink)] bg-[var(--signal)]"
                              aria-label={`Добавить ${game.title} в корзину`}
                            >
                              <CartIcon />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[var(--text-muted)]">
                    Сейчас в каталоге нет игр этого региона, которые помещаются
                    в остаток.
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
