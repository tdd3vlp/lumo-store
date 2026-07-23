import Link from "next/link";
import { FaTelegram } from "react-icons/fa6";
import { auth } from "@/auth";
import Header from "@/components/Header";
import TelegramStars from "@/components/TelegramStars";
import { pricedDenominations } from "@/lib/products/telegram-stars-quote";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", t: "Укажите username", d: "Публичный @username профиля, который хотите пополнить." },
  { n: "2", t: "Выберите количество", d: "От 50 до 2500 звёзд." },
  { n: "3", t: "Оплатите", d: "Зачисление происходит в течение нескольких минут после оплаты." },
];

export default async function TelegramStarsPage() {
  const [denominations, session] = await Promise.all([pricedDenominations(), auth()]);
  const authed = Boolean(session?.user);

  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />
      <section className="mx-auto max-w-7xl px-4 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Telegram Stars</span>
        </nav>

        <TelegramStars denominations={denominations} authed={authed} />

        {/* How it works */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--signal)] text-sm font-extrabold text-[var(--ink)]">
                {s.n}
              </span>
              <p className="mt-3 font-bold text-[var(--ink)]">{s.t}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Support */}
        <div className="mt-6 flex flex-col items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-[var(--text-muted)]">
            Свяжитесь с поддержкой, если возникли вопросы
          </p>
          <a
            href="https://t.me/lumocard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--ink)]/90"
          >
            <FaTelegram className="h-4 w-4" />
            Написать в поддержку
          </a>
        </div>
      </section>
    </main>
  );
}
