import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getCustomerDiscountRates } from "@/lib/account/loyalty";
import CheckoutAuthGate from "@/components/CheckoutAuthGate";
import FaqAccordion from "@/components/FaqAccordion";
import Header from "@/components/Header";
import SteamCheckoutForm from "@/components/SteamCheckoutForm";
import {
  MAX_TOPUP_RUB,
  MAX_TOPUPS_PER_ACCOUNT_PER_DAY,
  MAX_USD_PER_ACCOUNT_PER_DAY,
  MIN_TOPUP_RUB,
  type TopUpCurrency,
  isTopUpCurrency,
} from "@/lib/products/steam-topup";

export const dynamic = "force-dynamic";

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.4-3 8.5-7 10-4-1.5-7-5.6-7-10V6l7-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12l1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RUB_LIMITS = `от ${MIN_TOPUP_RUB.toLocaleString("ru-RU")} ₽ до ${MAX_TOPUP_RUB.toLocaleString("ru-RU")} ₽`;

// Must-read purchase rules, shown compactly above the FAQ. The limits quoted
// here are the ones actually enforced in lib/products/steam-topup.ts and
// lib/payments/checkout.ts — keep them in sync via the shared constants.
const RULES: Array<ReactNode> = [
  <>
    Указывайте логин <strong className="font-bold text-[var(--ink)]">своего</strong> аккаунта.
    Если после оплаты выяснится, что вы указали чужой логин — средства будут зачислены на
    указанный аккаунт, возврат и отмена пополнения в этом случае невозможны.
  </>,
  <>
    Пополняем аккаунты России, Казахстана, Беларуси, Узбекистана, Украины, Кыргызстана,
    Армении и других стран СНГ. Аккаунты с новых территорий (ДНР, ЛНР, Крым и т.&nbsp;п.)
    не пополняем.
  </>,
  <>
    Лимиты: <strong className="font-bold text-[var(--ink)]">{RUB_LIMITS}</strong> за
    один платёж, не более {MAX_TOPUPS_PER_ACCOUNT_PER_DAY} пополнений одного аккаунта в
    сутки (в любых сервисах, не только у нас) и не более{" "}
    {MAX_USD_PER_ACCOUNT_PER_DAY}&nbsp;$ суммарно в сутки.
  </>,
  <>
    Из-за колебаний курса валют зачисленная сумма может отличаться от заказанной
    в пределах ±2&nbsp;%.
  </>,
];

const FAQ_ITEMS = [
  {
    q: "Где найти свой логин Steam?",
    a: (
      <>
        Логин — это имя аккаунта, которое вы вводите при входе в Steam, а не отображаемый
        ник в профиле. Посмотреть его можно на странице аккаунта:{" "}
        <a
          href="https://store.steampowered.com/account"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--ink)] underline underline-offset-2"
        >
          store.steampowered.com/account
        </a>
        .
      </>
    ),
  },
  {
    q: "Аккаунты каких стран можно пополнить?",
    a: (
      <>
        Россия, Казахстан, Беларусь, Узбекистан, Украина, Кыргызстан, Армения и другие
        страны СНГ. Аккаунты с новых территорий (ДНР, ЛНР, Крым и т.&nbsp;п.) мы не
        пополняем.
      </>
    ),
  },
  {
    q: "У меня новый аккаунт — что нужно знать?",
    a: (
      <>
        Если аккаунт ещё ни разу не пополнялся картой, Steam при первом пополнении может
        сменить его регион и валюту. Рекомендуем сначала пополнить минимальную сумму и
        добавить на аккаунт несколько игр. Ответственность за смену региона со стороны
        Steam мы взять на себя не можем.
      </>
    ),
  },
  {
    q: "Почему зачисленная сумма может немного отличаться?",
    a: (
      <>
        Калькулятор считает сумму к получению для аккаунтов с валютой «рубль» по
        внутреннему курсу Steam, поэтому для них зачисление гарантировано с минимальным
        отклонением — не более ±2&nbsp;% при движениях курса. Если валюта вашего аккаунта
        не рубль, в моменты сильной нестабильности курса отклонение может быть заметнее.
        Актуальные курсы Steam можно посмотреть на{" "}
        <a
          href="https://steam-currency.ru"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--ink)] underline underline-offset-2"
        >
          steam-currency.ru
        </a>
        .
      </>
    ),
  },
  {
    q: "Сколько пополнений можно сделать за сутки?",
    a: (
      <>
        Один аккаунт можно пополнять не более {MAX_TOPUPS_PER_ACCOUNT_PER_DAY} раз в сутки —
        независимо от того, в каких сервисах сделаны пополнения. Один платёж —{" "}
        {RUB_LIMITS}, суммарно за сутки — не более {MAX_USD_PER_ACCOUNT_PER_DAY}&nbsp;$.
      </>
    ),
  },
];

export default async function SteamCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string; amount?: string; currency?: string }>;
}) {
  const { login: rawLogin, amount: rawAmount, currency: rawCurrency } = await searchParams;

  // The form is editable, so bad or missing params just mean emptier prefills —
  // never a 404. Validation and pricing run live in the form and again at payment.
  const initialLogin = (rawLogin ?? "").trim();
  const amountNum = Number(rawAmount);
  const initialAmount =
    Number.isInteger(amountNum) && amountNum > 0 ? String(amountNum) : "";
  const initialCurrency: TopUpCurrency = isTopUpCurrency(rawCurrency ?? "")
    ? (rawCurrency as TopUpCurrency)
    : "RUB";

  // Purchases require a signed-in profile (order history + tracking).
  const session = await auth();
  if (!session?.user) {
    return <CheckoutAuthGate backHref="/#steam-topup" />;
  }

  // Reflect the buyer's loyalty discount in the displayed total (the charge is
  // recomputed server-side at payment; this is display only).
  const rates = session.user.customerId
    ? await getCustomerDiscountRates(session.user.customerId)
    : null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 lg:px-8">
        <Link
          href="/#steam-topup"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
        >
          ← На главную
        </Link>

        <h1 className="mt-4 font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-4xl">
          Пополнение Steam
        </h1>

        <SteamCheckoutForm
          initialLogin={initialLogin}
          initialAmount={initialAmount}
          initialCurrency={initialCurrency}
          discountBps={rates?.topupBps ?? 0}
        />

        {/* Must-read rules */}
        <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            <ShieldIcon />
            Внимательно ознакомьтесь
          </p>
          <ul className="mt-4 space-y-3">
            {RULES.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm leading-6 text-[var(--text-muted)]"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal-strong)]"
                />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        <FaqAccordion items={FAQ_ITEMS} />
      </main>
    </>
  );
}
