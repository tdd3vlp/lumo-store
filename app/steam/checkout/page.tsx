import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { formatRubles } from "@/lib/pricing/rates";
import {
  formatTopUpAmount,
  isTopUpCurrency,
  isValidSteamLogin,
} from "@/lib/products/steam-topup";
import { quoteSteamTopUp } from "@/lib/products/steam-topup-quote";

export const dynamic = "force-dynamic";

function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7" aria-hidden="true">
      <path d="M6 12H4m2 0h2m-1-1v2m9-1h.01M18 11h.01" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h10a4 4 0 0 1 3.9 3.1l.8 4.2a2.2 2.2 0 0 1-4 1.6L16 15H8l-1.7 1.9a2.2 2.2 0 0 1-4-1.6l.8-4.2A4 4 0 0 1 7 8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function SteamCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string; amount?: string; currency?: string }>;
}) {
  const { login: rawLogin, amount: rawAmount, currency: rawCurrency } = await searchParams;
  const login = (rawLogin ?? "").trim();
  const amount = Number(rawAmount);
  const currency = isTopUpCurrency(rawCurrency ?? "") ? (rawCurrency as "RUB" | "KZT" | "UAH" | "USD") : "RUB";

  if (!isValidSteamLogin(login) || !Number.isInteger(amount) || amount <= 0) {
    notFound();
  }

  // Re-validate + re-price server-side — never trust the query string.
  const quote = await quoteSteamTopUp({ login, amount, currency });
  const amountLabel = formatTopUpAmount(amount, currency);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <Link
          href="/#steam-topup"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
        >
          ← Изменить заказ
        </Link>

        <h1 className="mt-4 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-4xl">
          Оформление заказа
        </h1>

        {quote.canRefill && quote.priceMinor != null ? (
          <>
            {/* Order summary */}
            <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Ваш заказ
              </p>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[var(--ink)] text-[var(--signal)]">
                  <GamepadIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--ink)]">
                    Пополнение Steam {amountLabel}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Логин: {login}</p>
                </div>
                <p className="font-[family-name:var(--font-unbounded)] text-xl font-bold tracking-[-0.03em] text-[var(--ink)]">
                  {formatRubles(quote.priceMinor)}
                </p>
              </div>
            </section>

            {/* Delivery details */}
            <section className="mt-5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Реквизиты доставки
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Steam логин</dt>
                  <dd className="font-semibold text-[var(--ink)]">{login}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Сумма</dt>
                  <dd className="font-semibold text-[var(--ink)]">{amountLabel}</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] p-4 text-sm text-[var(--text-muted)]">
                <WarningIcon />
                <p>
                  Удостоверьтесь, что Steam-логин верный.{" "}
                  <span className="font-bold text-[var(--ink)]">Возврат средств невозможен</span>, если
                  пополнили чужой аккаунт.
                </p>
              </div>
            </section>

            {/* Payment CTA — online payment is not wired yet (same state as the cart). */}
            <button
              type="button"
              disabled
              title="Онлайн-оплата на сайте скоро появится"
              className="mt-6 w-full cursor-not-allowed rounded-full bg-[var(--line)] px-6 py-4 text-sm font-extrabold text-[var(--text-muted)]"
            >
              Оплатить {formatRubles(quote.priceMinor)}
            </button>
            <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
              Онлайн-оплата на сайте в разработке.
            </p>
          </>
        ) : (
          <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-center">
            <p className="font-bold text-[var(--ink)]">Не удалось оформить пополнение</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {quote.error ?? "Проверьте логин и сумму и попробуйте ещё раз."}
            </p>
            <Link
              href="/#steam-topup"
              className="mt-4 inline-flex rounded-full bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
            >
              Вернуться
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
