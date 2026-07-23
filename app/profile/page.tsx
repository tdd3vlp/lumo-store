import Link from "next/link";
import { signOut, auth } from "@/auth";
import AuthModal from "@/components/AuthModal";
import Header from "@/components/Header";
import { type AccountOverview, getAccountOverview } from "@/lib/account/queries";
import { isAdminEmail } from "@/lib/auth/admin";
import { ACTIVATION_GUIDES } from "@/lib/instructions";

export const dynamic = "force-dynamic";

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

// Storefront product type → readable label + whether an activation guide exists.
const PRODUCT_NAMES: Record<string, string> = {
  apple: "App Store",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  steam: "Steam",
};
const GUIDE_SLUGS = new Set<string>(ACTIVATION_GUIDES.map((g) => g.slug));

// Human-readable order status + badge tone.
const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  fulfilling: "Выдаётся",
  fulfilled: "Доставлен",
  manual_review: "Проверяется",
  cancelled: "Отменён",
  refunded: "Возврат",
};

function statusBadgeClass(status: string): string {
  if (status === "fulfilled")
    return "border-transparent bg-[var(--signal)] text-[var(--ink)]";
  if (status === "manual_review" || status === "cancelled" || status === "refunded")
    return "border-[var(--line-strong)] text-[var(--text-muted)]";
  return "border-[var(--line-strong)] text-[var(--ink)]";
}

const RECENT_ORDERS = 5;

function pluralOrders(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заказа";
  return "заказов";
}

/** "5% на карты · 3% на топ-апы", collapsing to one figure when both match. */
function formatDiscount(cardBps: number, topupBps: number): string {
  if (cardBps === 0 && topupBps === 0) return "Скидки пока нет";
  const pct = (bps: number) => `${(bps / 100).toLocaleString("ru-RU")}%`;
  if (cardBps === topupBps) return `${pct(cardBps)} на всё`;
  return `${pct(cardBps)} на карты · ${pct(topupBps)} на топ-апы`;
}

type Order = AccountOverview["orders"][number];

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold text-[var(--text-muted)]">
            Заказ {order.publicId}
          </p>
          <h3 className="mt-1 text-xl font-bold text-[var(--ink)]">
            {formatRubles(order.totalMinor)}
          </h3>
        </div>
        <div className="text-sm md:text-right">
          <div className="font-semibold text-[var(--text-muted)]">
            {formatDate(order.createdAt)}
          </div>
          <span
            className={`mt-1.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadgeClass(order.status)}`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </div>

      {order.items.some((item) => item.codes.length > 0) && (
        <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
          {order.items
            .filter((item) => item.codes.length > 0)
            .map((item) => {
              const label =
                item.title ??
                (item.productType ? PRODUCT_NAMES[item.productType] : null) ??
                "Код";
              const guide =
                item.productType && GUIDE_SLUGS.has(item.productType)
                  ? item.productType
                  : null;
              return (
                <div key={item.id}>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {item.codes.map((code, i) => (
                      <code
                        key={`${item.id}-${i}`}
                        className="select-all rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 font-mono text-sm font-bold tracking-wide text-[var(--ink)]"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  {guide && (
                    <Link
                      href={`/instructions/${guide}`}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--ink)]/40"
                    >
                      Инструкция по активации
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </article>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  const customerId = session?.user?.customerId;
  const account = customerId ? await getAccountOverview(customerId) : null;
  const displayName =
    account?.customer.displayName ?? session?.user?.name ?? "Покупатель Lumo";
  const email = account?.customer.email ?? session?.user?.email ?? null;
  const isSignedIn = Boolean(session?.user);
  const isAdmin = isAdminEmail(email);
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
                {isSignedIn ? displayName : "Вход, заказы и бонусы Lumo"}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
                {isSignedIn
                  ? "Здесь собраны данные покупателя, история заказов, статусы выдачи карт и персональная скидка по программе лояльности."
                  : "Войди через удобный OAuth-провайдер, чтобы сохранять данные покупателя, видеть историю заказов и получать персональные бонусы."}
              </p>
            </div>

            {isSignedIn && (
              <div className="rounded-[18px] border border-white/14 bg-white/[0.055] p-5">
                <p className="text-sm font-bold text-white/58">Текущая сессия</p>
                <p className="mt-3 text-2xl font-bold">Вход выполнен</p>
                <p className="mt-2 text-sm leading-6 text-white/58">{email}</p>
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
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5 md:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Помощь
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]">
            Инструкции по активации
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Как активировать купленные коды на разных платформах. Эти же ссылки мы присылаем
            после оплаты.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {ACTIVATION_GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/instructions/${g.slug}`}
                className="group flex items-center justify-between gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 transition hover:border-[var(--ink)]/30"
              >
                <span className="text-sm font-bold text-[var(--ink)]">
                  {g.title.replace("Активация ", "")}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {!isSignedIn && (
          <section className="mt-6 rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Доступ
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]">
              Войди, чтобы открыть кабинет
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
              Авторизация откроется в модальном окне поверх текущей страницы.
            </p>
            <AuthModal
              trigger={
                <span className="mt-5 inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]">
                  Войти
                </span>
              }
            />
          </section>
        )}

        {isSignedIn && (
          <section className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-4 md:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_430px]">
              <div className="flex min-h-[220px] flex-col rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
                <p className="text-sm font-bold text-[var(--text-muted)]">
                  Бонусный статус
                </p>
                <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.045em] text-[var(--ink)] md:text-4xl">
                      {account?.loyalty.tierName ?? "Базовый"}
                    </h2>
                    {account && (
                      <p className="mt-2 inline-flex items-center rounded-full bg-[var(--signal)]/15 px-3 py-1 text-sm font-bold text-[var(--ink)]">
                        {formatDiscount(
                          account.loyalty.discountBasisPoints,
                          account.loyalty.topupDiscountBasisPoints,
                        )}
                      </p>
                    )}
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                      {account?.loyalty.nextTier
                        ? `До уровня ${account.loyalty.nextTier.name} осталось ${formatRubles(account.loyalty.nextTier.remainingSpendMinor)} — откроется скидка ${formatDiscount(account.loyalty.nextTier.discountBasisPoints, account.loyalty.nextTier.topupDiscountBasisPoints).toLowerCase()}.`
                        : account
                          ? "У тебя максимальный доступный уровень программы лояльности."
                          : "После первого оплаченного заказа здесь появится прогресс до следующего уровня и персональная скидка."}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[18px] bg-[var(--ink)] px-5 py-4 text-white">
                    <span className="block text-xs font-bold uppercase tracking-[0.16em] text-white/50">
                      Прогресс
                    </span>
                    <span className="mt-1 block text-3xl font-black text-[var(--signal)]">
                      {nextTierProgress}%
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-6">
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-[var(--signal-strong)]"
                      style={{ width: `${nextTierProgress}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mt-6 rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5">
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Админка
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">
              Управление магазином
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Каталог, склад и цены, аккаунты и игры.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/admin/ns-gifts"
                className="inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
              >
                Каталог
              </Link>
              <Link
                href="/admin/ps-accounts"
                className="inline-flex rounded-[13px] border border-[var(--line-strong)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                Аккаунты PlayStation
              </Link>
              <Link
                href="/admin/games"
                className="inline-flex rounded-[13px] border border-[var(--line-strong)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                Игры и предзаказы
              </Link>
            </div>
          </section>
        )}

        {isSignedIn && (
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
              <>
                <div className="mt-6 grid gap-3">
                  {account.orders.slice(0, RECENT_ORDERS).map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
                {account.orders.length > RECENT_ORDERS && (
                  <details className="group mt-3">
                    <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-[13px] border border-[var(--line-strong)] px-5 py-3 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]/40">
                      <span className="group-open:hidden">
                        Показать ещё {account.orders.length - RECENT_ORDERS}{" "}
                        {pluralOrders(account.orders.length - RECENT_ORDERS)}
                      </span>
                      <span className="hidden group-open:inline">Свернуть</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="h-4 w-4 transition group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </summary>
                    <div className="mt-3 grid gap-3">
                      {account.orders.slice(RECENT_ORDERS).map((order) => (
                        <OrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  </details>
                )}
              </>
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
        )}
      </main>
    </>
  );
}
