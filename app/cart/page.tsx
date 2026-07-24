"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import ImportantNote from "@/components/ImportantNote";
import ProductCover from "@/components/ProductCover";
import { discountedUnitMinor } from "@/lib/account/loyalty-discount";
import { formatRubles } from "@/lib/pricing/rates";
import {
  PS_ACCOUNT_PRICE_MINOR,
  PS_ACCOUNT_REGION_META,
  PS_ACCOUNT_REGION_ORDER,
} from "@/lib/ps-accounts/config";
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
      <path
        d="M4 5h2l2 10h9l2-7H7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M5 7h14M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6.5 7l1 14h9l1-14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--signal)]"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CART_TRUST = [
  "Мгновенная доставка после оплаты",
  "Коды пополнения доступны в личном кабинете",
  "Дружелюбная поддержка",
];

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);

  // Checkout requires a signed-in profile (order history + tracking).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Loyalty card discount for the signed-in buyer (display only; the charge is
  // recomputed server-side at order creation). Cart items are all card-class.
  const [discountBps, setDiscountBps] = useState(0);

  async function startCheckout() {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/payments/paypalych/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey:
            globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
          items: cart.map((i) => ({
            denominationId: i.denominationId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        payUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.payUrl) {
        setCheckoutError(
          data?.error ?? "Не удалось перейти к оплате. Попробуйте ещё раз.",
        );
        setCheckoutBusy(false);
        return;
      }
      // Hand off to the PayPalych hosted payment page.
      window.location.assign(data.payUrl);
    } catch {
      setCheckoutError("Сеть недоступна. Попробуйте ещё раз.");
      setCheckoutBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((session: { user?: unknown } | null) => {
        if (active) setIsAuthenticated(Boolean(session?.user));
      })
      .catch(() => {
        if (active) setIsAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/account/loyalty", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((rates: { cardBps?: number } | null) => {
        if (active && rates) setDiscountBps(Number(rates.cardBps) || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + (item.priceMinor ?? 0) * item.quantity,
        0,
      ),
    [cart],
  );
  // Discount applied per unit (rounded to whole rubles) so the shown total
  // matches what's charged. Cart lines are all card-class.
  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          discountedUnitMinor(item.priceMinor ?? 0, discountBps) *
            item.quantity,
        0,
      ),
    [cart, discountBps],
  );
  const discountMinor = subtotal - total;
  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const hasPsAccountInCart = useMemo(
    () => cart.some((item) => item.productType === "ps-account"),
    [cart],
  );

  const hasPsCards = useMemo(
    () => cart.some((item) => item.productType === "playstation"),
    [cart],
  );
  // PS-card regions in the cart that don't yet have a matching account — offer
  // to add one, same as the PlayStation page upsell.
  const accountUpsellRegions = useMemo(() => {
    const withAccount = new Set(
      cart.filter((i) => i.productType === "ps-account").map((i) => i.region),
    );
    const cardRegions = new Set(
      cart.filter((i) => i.productType === "playstation").map((i) => i.region),
    );
    return PS_ACCOUNT_REGION_ORDER.filter(
      (r) => cardRegions.has(r) && !withAccount.has(r),
    );
  }, [cart]);

  function fmtPrice(priceMinor: number | null): string {
    if (priceMinor == null) return "Цена уточняется";
    return formatRubles(priceMinor);
  }

  function addAccount(region: string) {
    addToCart({
      denominationId: `ps-account-${region.toLowerCase()}`,
      productType: "ps-account",
      title: `Аккаунт PlayStation (${PS_ACCOUNT_REGION_META[region]?.label ?? region})`,
      region,
      currency: "",
      amountMajor: 1,
      priceMinor: PS_ACCOUNT_PRICE_MINOR,
      image: "/banners/ps-accounts.png",
    });
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-12 md:pb-16 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link
            href="/"
            className="font-semibold transition hover:text-[var(--ink)]"
          >
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
                      <ProductCover
                        image={item.image}
                        productType={item.productType}
                        amountMajor={item.amountMajor}
                        currency={item.currency}
                        region={item.region}
                        sizes="94px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-lg font-bold text-[var(--ink)] sm:text-xl">
                        {item.title}
                      </p>
                      {item.currency ? (
                        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                          Номинал {item.amountMajor.toLocaleString("ru-RU")}{" "}
                          {item.currency}
                        </p>
                      ) : null}
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

              {hasPsCards && (
                <>
                  {accountUpsellRegions.length > 0 && (
                    <div className="mt-6 rounded-[20px] border border-[var(--line)] bg-[var(--card-surface)] p-5">
                      <p className="text-sm font-bold text-[var(--ink)]">
                        Нужен аккаунт этого региона?
                      </p>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Новый аккаунт — {formatRubles(PS_ACCOUNT_PRICE_MINOR)}.
                        Почту и пароль можно менять, доступ только у вас.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {accountUpsellRegions.map((region) => (
                          <button
                            key={region}
                            type="button"
                            onClick={() => addAccount(region)}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]"
                          >
                            + Аккаунт{" "}
                            {PS_ACCOUNT_REGION_META[region]?.label ?? region}
                            <span className="text-[var(--text-muted)]">
                              {formatRubles(PS_ACCOUNT_PRICE_MINOR)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <ImportantNote />
                </>
              )}
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
                {discountMinor > 0 && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/55">Без скидки</dt>
                      <dd className="font-bold text-white/55 line-through">
                        {formatRubles(subtotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--signal)]">
                        Скидка −{(discountBps / 100).toLocaleString("ru-RU")}%
                      </dt>
                      <dd className="font-bold text-[var(--signal)]">
                        −{formatRubles(discountMinor)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {hasPsAccountInCart ? (
                <p className="mt-5 rounded-[12px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
                  Данные аккаунта PlayStation — почта, пароль, коды 2FA и дата
                  рождения — после оплаты появятся в{" "}
                  <span className="font-bold text-[var(--ink)]">
                    личном кабинете
                  </span>
                  . На почту придёт подтверждение готовности; сами данные
                  письмом не отправляем — так безопаснее.
                </p>
              ) : null}
              {isAuthenticated === false ? (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="mt-6 w-full rounded-[13px] bg-[var(--signal)] px-5 py-4 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
                >
                  Войти для оформления
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={checkoutBusy}
                  className="mt-6 w-full rounded-[13px] bg-[var(--signal)] px-5 py-4 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkoutBusy ? "Переходим к оплате…" : "Перейти к оплате"}
                </button>
              )}
              {checkoutError ? (
                <p className="mt-3 text-xs leading-5 text-[var(--coral)]">
                  {checkoutError}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-white/45">
                  {isAuthenticated === false
                    ? "Войдите в свой профиль, чтобы сохранить историю заказов и продолжить накопление скидок."
                    : "Оплата картой или через СБП. После оплаты коды будут доступны в личном кабинете и на почту придет подтверждение заказа."}
                </p>
              )}

              <ul className="mt-5 space-y-2.5 border-t border-white/12 pt-5 text-xs leading-5 text-white/60">
                {CART_TRUST.map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckIcon />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
