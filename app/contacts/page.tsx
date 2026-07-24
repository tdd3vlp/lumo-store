import Image from "next/image";
import Link from "next/link";
import { FaEnvelope, FaTelegram } from "react-icons/fa6";
import Header from "@/components/Header";

export const metadata = { title: "Контакты — Lumo" };

export default function ContactsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 lg:px-8">
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
          <span>Контакты</span>
        </nav>

        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
          Контакты
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
          Свяжитесь с нами, если у вас вопрос по заказу, активации кода или
          выбору региона.
        </p>

        {/* Channels */}
        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Связаться с нами
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <a
              href="https://t.me/lumocard"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3.5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition hover:border-[var(--ink)]/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#29a9ea] text-white">
                <FaTelegram className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-[var(--ink)]">
                  Telegram
                </span>
                <span className="block truncate text-sm text-[var(--text-muted)]">
                  @lumocard
                </span>
              </span>
            </a>

            <a
              href="https://linku.su/lumocard"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3.5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition hover:border-[var(--ink)]/30"
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[13px]">
                <Image
                  src="/max.png"
                  alt="MAX"
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-[var(--ink)]">MAX</span>
                <span className="block truncate text-sm text-[var(--text-muted)]">
                  linku.su/lumocard
                </span>
              </span>
            </a>

            <a
              href="mailto:support@lumo-store.ru"
              className="group flex items-center gap-3.5 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 transition hover:border-[var(--ink)]/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-white">
                <FaEnvelope className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-[var(--ink)]">Почта</span>
                <span className="block truncate text-sm text-[var(--text-muted)]">
                  support@lumo-store.ru
                </span>
              </span>
            </a>
          </div>
        </section>

        {/* Schedule */}
        <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Режим работы
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[var(--text-muted)]">Магазин</dt>
              <dd className="font-semibold text-[var(--ink)] sm:text-right">
                Круглосуточно
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-[var(--line)] pt-3 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[var(--text-muted)]">Поддержка</dt>
              <dd className="font-semibold text-[var(--ink)] sm:text-right">
                с 10:00 до 22:00 (по Московскому времени)
              </dd>
            </div>
          </dl>
        </section>

        {/* Requisites */}
        <section className="mt-6 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Реквизиты
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[var(--text-muted)]">Продавец</dt>
              <dd className="font-semibold text-[var(--ink)] sm:text-right">
                ИП Тодоров Антон Юрьевич
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-[var(--line)] pt-3 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[var(--text-muted)]">
                Регистрационный номер
              </dt>
              <dd className="font-semibold text-[var(--ink)] sm:text-right">
                326480000013971
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
