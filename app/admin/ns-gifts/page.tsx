import { auth } from "@/auth";
import Header from "@/components/Header";
import NsGiftsCatalogBrowser from "@/components/admin/NsGiftsCatalogBrowser";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  listCuratedDenominations,
  type CuratedDenomination,
} from "@/lib/gift-cards/denominations";

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="mt-8 rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-6">
      <h2 className="text-xl font-bold text-[var(--ink)]">Нет доступа</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Эта страница доступна только администраторам. Войдите под учётной
        записью из списка ADMIN_EMAILS.
      </p>
    </div>
  );
}

export default async function AdminNsGiftsPage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  let denominations: CuratedDenomination[] = [];
  let loadError = false;
  if (isAdmin) {
    try {
      denominations = await listCuratedDenominations();
    } catch {
      loadError = true;
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 md:px-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Администрирование
        </p>
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          Каталог NS.gifts
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Подтягивайте позиции из NS.gifts, добавляйте их в каталог магазина с
          нужной ценой и пополняйте склад покупкой кодов.
        </p>

        {!isAdmin ? (
          <AccessDenied />
        ) : loadError ? (
          <div className="mt-8 rounded-[18px] border border-red-300 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-700">Ошибка</h2>
            <p className="mt-2 text-sm leading-6 text-red-600">
              Не удалось загрузить товары. Проверьте подключение к базе данных.
            </p>
          </div>
        ) : (
          <NsGiftsCatalogBrowser initialDenominations={denominations} />
        )}
      </main>
    </>
  );
}
