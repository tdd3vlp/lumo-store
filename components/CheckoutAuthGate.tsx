import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";

// Shown in place of a checkout when the visitor isn't signed in. Purchases
// require a profile so the order lands in the buyer's history and support can
// track it. Rendered from server checkout pages after an auth() check.
export default function CheckoutAuthGate({ backHref }: { backHref: string }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
        >
          ← Назад
        </Link>
        <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-center">
          <p className="font-bold text-[var(--ink)]">Войдите, чтобы оформить заказ</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[var(--text-muted)]">
            Покупка доступна после входа в профиль — так заказ сохранится в истории, и мы
            сможем отслеживать его статус.
          </p>
          <div className="mt-4 flex justify-center">
            <AuthModal
              trigger={
                <span className="inline-flex rounded-full bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]">
                  Войти в профиль
                </span>
              }
            />
          </div>
        </section>
      </main>
    </>
  );
}
