"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useStore } from "@/store/useStore";

const providers = [
  {
    id: "google",
    name: "Google",
    note: "Для международных аккаунтов и быстрой верификации email",
  },
  {
    id: "yandex",
    name: "Яндекс",
    note: "Удобно для покупателей с российской почтой и сервисами Яндекса",
  },
  {
    id: "vk",
    name: "ВКонтакте",
    note: "Быстрый вход через VK ID",
  },
];

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function ProfilePage() {
  const favorites = useStore((state) => state.favorites);
  const cart = useStore((state) => state.cart);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Math.round(
    cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
  );

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
                Вход, заказы и бонусы Lumo
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68">
                Здесь будут сохранённые данные покупателя, история заказов,
                статусы выдачи карт и персональная скидка по программе лояльности.
              </p>
            </div>

            <div className="rounded-[18px] border border-white/14 bg-white/[0.055] p-5">
              <p className="text-sm font-bold text-white/58">Текущая сессия</p>
              <p className="mt-3 text-2xl font-bold">Вход не выполнен</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Подключим OAuth, и этот блок начнёт показывать email, имя и
                привязанные способы входа.
              </p>
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
                  Войти или создать аккаунт
                </h2>
              </div>
              <span className="w-fit rounded-[9px] bg-[var(--ink)] px-3 py-1.5 text-xs font-extrabold text-[var(--signal)]">
                OAuth-ready
              </span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className="rounded-[16px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 text-left transition hover:border-[var(--line-strong)] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)]"
                >
                  <span className="block text-lg font-extrabold text-[var(--ink)]">
                    {provider.name}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--text-muted)]">
                    {provider.note}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-5">
              <h3 className="text-lg font-bold text-[var(--ink)]">
                Что подключаем следующим шагом
              </h3>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--text-muted)] sm:grid-cols-2">
                <p>Сессия пользователя и callback-роуты Auth.js.</p>
                <p>Связка OAuth identity с таблицами customers и customer_profiles.</p>
                <p>Сохранение имени, телефона и согласия на уведомления.</p>
                <p>Подтягивание реальных заказов через getAccountOverview.</p>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <section className="rounded-[20px] bg-[var(--ink)] p-5 text-white">
              <p className="text-sm font-bold text-white/55">Твоя витрина</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link
                  href="/favorites"
                  className="rounded-[15px] border border-white/14 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]"
                >
                  <span className="block text-3xl font-bold text-[var(--signal)]">
                    {favorites.length}
                  </span>
                  <span className="mt-1 block text-sm text-white/58">
                    в избранном
                  </span>
                </Link>
                <Link
                  href="/cart"
                  className="rounded-[15px] border border-white/14 bg-white/[0.055] p-4 transition hover:bg-white/[0.09]"
                >
                  <span className="block text-3xl font-bold text-[var(--signal)]">
                    {cartCount}
                  </span>
                  <span className="mt-1 block text-sm text-white/58">
                    в корзине
                  </span>
                </Link>
              </div>
              <div className="mt-3 rounded-[15px] border border-white/14 bg-white/[0.055] p-4">
                <span className="block text-sm text-white/55">
                  Сумма корзины
                </span>
                <span className="mt-1 block text-2xl font-bold text-white">
                  {formatINR(cartTotal)}
                </span>
              </div>
            </section>

            <section className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5">
              <p className="text-sm font-bold text-[var(--text-muted)]">
                Бонусный статус
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">
                Базовый
              </h2>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full w-0 rounded-full bg-[var(--signal-strong)]" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                После первого оплаченного заказа здесь появится прогресс до
                следующего уровня и персональная скидка.
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

          <div className="mt-6 rounded-[18px] border border-dashed border-[var(--line-strong)] bg-[var(--paper)] px-5 py-10 text-center">
            <h3 className="text-xl font-bold text-[var(--ink)]">
              Заказов пока нет
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
              Когда подключим авторизацию и оформление заказа, здесь появятся
              номера заказов, статусы оплаты, выдача кодов и суммы с учётом
              скидок.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
