import Image from "next/image";
import Link from "next/link";
import { FaTelegram } from "react-icons/fa6";
import Header from "@/components/Header";
import SupportForm from "@/components/SupportForm";

export const metadata = { title: "Поддержка — Lumo" };

export default function SupportPage() {
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
          <span>Поддержка</span>
        </nav>

        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
          Поддержка
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
          Напишите нам любым удобным способом — поможем разобраться с заказом,
          активацией и выбором региона.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="https://t.me/lumocard"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 transition hover:border-[var(--ink)]/30"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#29a9ea] text-white">
              <FaTelegram className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-[var(--ink)]">Telegram</p>
              <p className="text-sm text-[var(--text-muted)]">@lumocard</p>
            </div>
          </a>

          <a
            href="https://linku.su/lumocard"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 transition hover:border-[var(--ink)]/30"
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px]">
              <Image
                src="/max.png"
                alt="MAX"
                fill
                sizes="48px"
                className="object-cover"
              />
            </span>
            <div>
              <p className="font-bold text-[var(--ink)]">MAX</p>
              <p className="text-sm text-[var(--text-muted)]">
                linku.su/lumocard
              </p>
            </div>
          </a>
        </div>

        {/* Feedback form → support@lumo-store.ru */}
        <div className="mt-10">
          <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
            Написать в поддержку
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Оставьте сообщение, мы ответим в течение 24 часов на указанный
            контакт.
          </p>
          <div className="mt-5">
            <SupportForm />
          </div>
        </div>
      </main>
    </>
  );
}
