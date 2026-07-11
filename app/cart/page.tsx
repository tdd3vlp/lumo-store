"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import Header from "@/components/Header";
import { formatRubles } from "@/lib/pricing/rates";
import { useStore } from "@/store/useStore";

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

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (item.priceMinor ?? 0) * item.quantity, 0),
    [cart],
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  function fmtPrice(priceMinor: number | null): string {
    if (priceMinor == null) return "Цена уточняется";
    return formatRubles(priceMinor);
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
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
              Карты и пополнения
            </p>
            <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
              Корзина
            </h1>
          </div>

          {cart.length > 0 && (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--ink)] px-2.5 text-sm font-extrabold text-[var(--signal)]">
              {itemCount}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <section className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-7 md:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--ink)] text-[var(--signal)]">
              <CartIcon />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-[var(--ink)]">
              Корзина пока пуста
            </h2>
            <p className="mt-2 max-w-xl text-[var(--text-muted)]">
              Выбери карту или пополнение из каталога.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)]"
            >
              В каталог
            </Link>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[var(--ink)]">Товары</h2>
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="rounded-[12px] border border-[var(--line-strong)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
                >
                  Очистить
                </button>
              </div>

              <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {cart.map((item) => (
                  <article
                    key={item.denominationId}
                    className="flex gap-4 py-5 sm:items-center sm:gap-6"
                  >
                    <div className="relative h-[110px] w-[82px] shrink-0 overflow-hidden rounded-[14px] bg-[#d7d1c7] sm:h-[126px] sm:w-[94px]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="94px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-lg font-bold text-[var(--ink)] sm:text-xl">
                        {item.title}
                      </p>
                      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                        Номинал {item.amountMajor.toLocaleString("ru-RU")} {item.currency}
                      </p>
                      <p className="mt-1 font-extrabold text-[var(--ink)]">
                        {fmtPrice(item.priceMinor)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.denominationId)}
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
                              denominationId: item.denominationId,
                              productType: item.productType,
                              title: item.title,
                              region: item.region,
                              currency: item.currency,
                              amountMajor: item.amountMajor,
                              priceMinor: item.priceMinor,
                              image: item.image,
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
                      onClick={() => removeFromCart(item.denominationId)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[12px] border border-[var(--line)] text-[var(--text-muted)] transition hover:border-[var(--coral)] hover:text-[var(--coral)]"
                      aria-label={`Удалить ${item.title}`}
                    >
                      <TrashIcon />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <aside className="h-fit rounded-[20px] bg-[var(--ink)] p-6 text-white lg:sticky lg:top-24">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--signal)]">
                К оплате
              </p>
              <p className="mt-3 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em]">
                {formatRubles(total)}
              </p>
              <dl className="mt-6 space-y-3 border-t border-white/12 pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/55">Позиций</dt>
                  <dd className="font-bold">{itemCount}</dd>
                </div>
              </dl>
              <button
                type="button"
                disabled
                title="Оплата на сайте скоро появится"
                className="mt-6 w-full cursor-not-allowed rounded-[13px] bg-white/12 px-5 py-4 font-extrabold text-white/55"
              >
                Оформление — скоро
              </button>
              <p className="mt-3 text-xs leading-5 text-white/45">
                Онлайн-оплата на сайте в разработке. Скоро здесь можно будет
                оформить заказ и получить код на почту.
              </p>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
