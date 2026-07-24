import Link from "next/link";
import AppleActivationGuide from "@/components/AppleActivationGuide";
import Header from "@/components/Header";

export default function AppleInstructionsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-12 md:pb-16 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/instructions" className="font-semibold transition hover:text-[var(--ink)]">
            Инструкции
          </Link>
          <span aria-hidden="true">/</span>
          <span>App Store</span>
        </nav>

        {/* The guide already has its own top margin. */}
        <AppleActivationGuide />
      </main>
    </>
  );
}
