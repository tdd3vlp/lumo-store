import { auth } from "@/auth";
import Header from "@/components/Header";
import AdminPricingRatesForm from "@/components/admin/AdminPricingRatesForm";
import { isAdminEmail } from "@/lib/auth/admin";
import type { RegionPricingRate } from "@/lib/pricing/rates";
import { getRegionalPricingRates } from "@/lib/pricing/rates.server";

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

export default async function AdminPricingPage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-36 pt-6 md:px-6">
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          Курсы регионов
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Управление курсами региональных валют к рублю. Значение — сколько
          рублей за одну единицу валюты региона.
        </p>

        {isAdmin ? <AdminPricingRatesContent /> : <AccessDenied />}
      </main>
    </>
  );
}

async function AdminPricingRatesContent() {
  let rates: RegionPricingRate[] | null = null;
  try {
    rates = await getRegionalPricingRates();
  } catch {
    rates = null;
  }

  if (!rates) {
    return (
      <div className="mt-8 rounded-[18px] border border-red-300 bg-red-50 p-6">
        <h2 className="text-xl font-bold text-red-700">Ошибка</h2>
        <p className="mt-2 text-sm leading-6 text-red-600">
          Не удалось загрузить курсы. Проверьте подключение к базе данных.
        </p>
      </div>
    );
  }

  return <AdminPricingRatesForm initialRates={rates} />;
}
