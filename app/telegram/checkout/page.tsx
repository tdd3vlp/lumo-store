import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import CheckoutAuthGate from "@/components/CheckoutAuthGate";
import Header from "@/components/Header";
import PayNowButton from "@/components/PayNowButton";
import { formatRubles } from "@/lib/pricing/rates";
import {
  findDenomination,
  formatStars,
  isValidTelegramUsername,
  normalizeTelegramUsername,
} from "@/lib/products/telegram-stars";
import { priceStars } from "@/lib/products/telegram-stars-quote";

export const dynamic = "force-dynamic";

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
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

export default async function TelegramCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string; stars?: string }>;
}) {
  const { username: rawUsername, stars: rawStars } = await searchParams;
  const username = normalizeTelegramUsername(rawUsername ?? "");
  const stars = Number(rawStars);

  if (!isValidTelegramUsername(username) || !findDenomination(stars)) {
    notFound();
  }

  // Purchases require a signed-in profile so the order is tied to a customer
  // (history, order tracking). Gate the checkout, not just the button.
  const session = await auth();
  if (!session?.user) {
    return <CheckoutAuthGate backHref="/telegram/stars" />;
  }

  // Re-price server-side off the fixed USD cost + global rate (never trust the
  // query string).
  const priceMinor = await priceStars(stars);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <Link
          href="/telegram/stars"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
        >
          ← Изменить заказ
        </Link>

        <h1 className="mt-4 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-4xl">
          Оформление заказа
        </h1>

        {priceMinor != null ? (
          <>
            {/* Order summary */}
            <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Ваш заказ
              </p>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[var(--ink)] text-[var(--signal)]">
                  <StarIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--ink)]">
                    Telegram Stars — {formatStars(stars)} ⭐
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">Получатель: @{username}</p>
                </div>
                <p className="font-[family-name:var(--font-unbounded)] text-xl font-bold tracking-[-0.03em] text-[var(--ink)]">
                  {formatRubles(priceMinor)}
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
                  <dt className="text-[var(--text-muted)]">Username получателя</dt>
                  <dd className="font-semibold text-[var(--ink)]">@{username}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--text-muted)]">Количество</dt>
                  <dd className="font-semibold text-[var(--ink)]">{formatStars(stars)} звёзд</dd>
                </div>
              </dl>

              <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] p-4 text-sm text-[var(--text-muted)]">
                <WarningIcon />
                <p>
                  Проверьте username получателя.{" "}
                  <span className="font-bold text-[var(--ink)]">Возврат средств невозможен</span>, если
                  звёзды ушли на чужой аккаунт.
                </p>
              </div>
            </section>

            <PayNowButton
              body={{ kind: "telegram", username, stars }}
              label={`Оплатить ${formatRubles(priceMinor)}`}
            />
          </>
        ) : (
          <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-center">
            <p className="font-bold text-[var(--ink)]">Не удалось оформить заказ</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Проверьте username и пакет и попробуйте ещё раз.
            </p>
            <Link
              href="/telegram/stars"
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
