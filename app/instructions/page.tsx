import Link from "next/link";
import Header from "@/components/Header";
import { ACTIVATION_GUIDES } from "@/lib/instructions";

export default function InstructionsIndexPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-12 md:pb-16 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Инструкции</span>
        </nav>

        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-5xl">
          Инструкции по активации
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
          Как активировать купленные коды на разных платформах. Ссылку на нужную инструкцию мы
          также присылаем после оплаты.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ACTIVATION_GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/instructions/${g.slug}`}
              className="group flex flex-col rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 transition hover:border-[var(--ink)]/30"
            >
              <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold tracking-[-0.02em] text-[var(--ink)]">
                {g.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{g.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--sky)]">
                Открыть
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
