import Link from "next/link";
import { signIn, signOut, auth } from "@/auth";
import Header from "@/components/Header";
import ProfileLocalStats from "@/components/ProfileLocalStats";
import { getAccountOverview } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

const providers = [
  {
    id: "google",
    name: "Google",
    note: "Для международных аккаунтов и быстрой верификации email",
    idEnv: "AUTH_GOOGLE_ID",
    secretEnv: "AUTH_GOOGLE_SECRET",
  },
  {
    id: "yandex",
    name: "Яндекс",
    note: "Удобно для покупателей с российской почтой и сервисами Яндекса",
    idEnv: "AUTH_YANDEX_ID",
    secretEnv: "AUTH_YANDEX_SECRET",
  },
  {
    id: "vk",
    name: "ВКонтакте",
    note: "Быстрый вход через VK ID",
    idEnv: "AUTH_VK_ID",
    secretEnv: "AUTH_VK_SECRET",
  },
];

function formatRubles(valueMinor: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ProfilePage() {
  const session = await auth();
  const customerId = session?.user?.customerId;
  const account = customerId ? await getAccountOverview(customerId) : null;
  const displayName =
    account?.customer.displayName ?? session?.user?.name ?? "Покупатель Lumo";
  const email = account?.customer.email ?? session?.user?.email ?? null;
  const nextTierProgress =
    account?.loyalty.nextTier && account.loyalty.nextTier.requiredSpendMinor > 0
      ? Math.min(
          100,
          Math.round(
            (account.loyalty.lifetimeSpendMinor /
              account.loyalty.nextTier.requiredSpendMinor) *
              100,
          ),
        )
      : account
        ? 100
        : 0;

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Профиль</span>
        </nav>

        <section className="overflow-hidden rounded-[24px] bg-[var(--ink)] text-white">
          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_360px] md:p-8 lg:p-10">
            <div>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--signal)]">
                Личный кабинет
              </p>
              <h1 className="max-w-3xl font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] md:text-5xl">
                {session?.user ? displayName : "Вход, заказы и бонусы Lumo"}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
                {session?.user
                  ? "Здесь собраны данные покупателя, история заказов, статусы выдачи карт и персональная скидка по программе лояльности."
                  : "Войди через удобный OAuth-провайдер, чтобы сохранять данные покупателя, видеть историю заказов и получать персональные бонусы."}
              </p>
            </div>

            <div className="rounded-[18px] border border-white/14 bg-white/[0.055] p-5">
              <p className="text-sm font-bold text-white/58">Текущая сессия</p>
              <p className="mt-3 text-2xl font-bold">
                {session?.user ? "Вход выполнен" : "Вход не выполнен"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {email ?? "Выбери Google, Яндекс или ВКонтакте ниже."}
              </p>
              {session?.user && (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/profile" });
                  }}
                >
                  <button
                    type="submit"
                    className="mt-5 rounded-[13px] border border-white/18 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Выйти
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5 md:p-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Авторизация
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]">
                  {session?.user ? "Способы входа" : "Войти или создать аккаунт"}
                </h2>
              </div>
              <span className="w-fit rounded-[9px] bg-[var(--ink)] px-3 py-1.5 text-xs font-extrabold text-[var(--signal)]">
                Auth.js
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {providers.map((provider) => {
                const configured = Boolean(
                  process.env[provider.idEnv] && process.env[provider.secretEnv],
                );

                return (
                  <form
                    key={provider.id}
                    action={async () => {
                      "use server";
                      await signIn(provider.id, { redirectTo: "/profile" });
                    }}
                  >
                    <button
                      type="submit"
                      disabled={!configured}
                      className="h-full w-full rounded-[16px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 text-left transition hover:border-[var(--line-strong)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[var(--line)] disabled:hover:bg-[var(--paper-strong)]"
                    >
                      <span className="block text-lg font-extrabold text-[var(--ink)]">
                        {provider.name}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-[var(--text-muted)]">
                        {configured
                          ? provider.note
                          : `Нужны ${provider.idEnv} и ${provider.secretEnv}`}
                      </span>
                    </button>
                  </form>
                );
              })}
            </div>

            {!session?.user && (
              <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-5">
                <h3 className="text-lg font-bold text-[var(--ink)]">
                  Что уже подключено
                </h3>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2">
                  <p>Callback-роуты Auth.js для Google, Яндекса и VK.</p>
                  <p>JWT-сессия с customerId внутри session.user.</p>
                  <p>Связка OAuth identity с customers и customer_profiles.</p>
                  <p>Подтягивание заказов через getAccountOverview после входа.</p>
                </div>
              </div>
            )}
          </section>

          <aside className="grid gap-4">
            <ProfileLocalStats />

            <section className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5">
              <p className="text-sm font-bold text-[var(--text-muted)]">
                Бонусный статус
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">
                {account?.loyalty.tierName ?? "Базовый"}
              </h2>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full rounded-full bg-[var(--signal-strong)]"
                  style={{ width: `${nextTierProgress}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                {account?.loyalty.nextTier
                  ? `До уровня ${account.loyalty.nextTier.name} осталось ${formatRubles(account.loyalty.nextTier.remainingSpendMinor)}.`
                  : account
                    ? "У тебя максимальный доступный уровень программы лояльности."
                    : "После первого оплаченного заказа здесь появится прогресс до следующего уровня и персональная скидка."}
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-6 rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5 md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Заказы
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]">
                История покупок
              </h2>
            </div>
            <Link
              href="/cart"
              className="inline-flex w-fit rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
            >
              Перейти в корзину
            </Link>
          </div>

          {account && account.orders.length > 0 ? (
            <div className="mt-6 grid gap-3">
              {account.orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-muted)]">
                        Заказ {order.publicId}
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-[var(--ink)]">
                        {formatRubles(order.totalMinor)}
                      </h3>
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-muted)]">
                      {formatDate(order.createdAt)} · {order.status}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-5 py-10 text-center">
              <h3 className="text-xl font-bold text-[var(--ink)]">
                Заказов пока нет
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                Когда появятся оплаченные заказы, здесь будут номера, статусы
                оплаты, выдача кодов и суммы с учётом скидок.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
