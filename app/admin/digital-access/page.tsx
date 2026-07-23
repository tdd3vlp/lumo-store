import { auth } from "@/auth";
import Header from "@/components/Header";
import DigitalAccessHistory from "@/components/admin/DigitalAccessHistory";
import { ADMIN_LOG_LIMIT, auditRepository } from "@/lib/audit/repository";
import type { DigitalAccessLogRow } from "@/lib/audit/types";
import { isAdminEmail } from "@/lib/auth/admin";

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

function LoadError() {
  return (
    <div className="mt-8 rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-6">
      <h2 className="text-xl font-bold text-[var(--ink)]">
        Не удалось загрузить журнал
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Попробуйте обновить страницу.
      </p>
    </div>
  );
}

export default async function AdminDigitalAccessPage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  let rows: DigitalAccessLogRow[] = [];
  let loadError = false;
  if (isAdmin) {
    try {
      rows = await auditRepository.list({ limit: ADMIN_LOG_LIMIT });
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-36 pt-6 md:px-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Администрирование
        </p>
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          История доступа к цифровому товару
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Неизменяемый журнал всех событий выдачи цифровых кодов: открытие
          страницы, принятие условий, показ и копирование кода. Время указано в
          UTC.
        </p>

        {!isAdmin ? (
          <AccessDenied />
        ) : loadError ? (
          <LoadError />
        ) : (
          <DigitalAccessHistory initialRows={rows} />
        )}
      </main>
    </>
  );
}
