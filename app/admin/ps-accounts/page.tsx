import { auth } from "@/auth";
import Header from "@/components/Header";
import PsAccountsManager from "@/components/admin/PsAccountsManager";
import { isAdminEmail } from "@/lib/auth/admin";
import { availablePsAccountCounts } from "@/lib/ps-accounts/store";

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="mt-8 rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-6">
      <h2 className="text-xl font-bold text-[var(--ink)]">Нет доступа</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Эта страница доступна только администраторам.
      </p>
    </div>
  );
}

export default async function AdminPsAccountsPage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  const counts = isAdmin ? await availablePsAccountCounts() : {};

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-12 md:pb-16 pt-6 md:px-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Администрирование
        </p>
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          Аккаунты PlayStation
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Склад аккаунтов по регионам. Добавляйте данные аккаунтов — они шифруются и хранятся
          до выдачи покупателю.
        </p>

        {isAdmin ? <PsAccountsManager initialCounts={counts} /> : <AccessDenied />}
      </main>
    </>
  );
}
