// Activation instructions + FAQ for the Nintendo page. Static content — the FAQ
// uses native <details> so it expands without any client JS. Steps, the
// region-change walkthrough and the tax-free ZIP list are the merchant's own
// copy, kept as given.

import FaqAccordion from "@/components/FaqAccordion";
import ImportantNote from "@/components/ImportantNote";

const METHODS: Array<{ n: number; title: string; steps: string[] }> = [
  {
    n: 1,
    title: "На консоли",
    steps: [
      "Перейдите в eShop, войдите в свой аккаунт.",
      "Выберите пункт «Enter Code» и введите приобретённый код.",
      "Нажмите «A» — средства зачислятся на ваш счёт.",
    ],
  },
  {
    n: 2,
    title: "На сайте Nintendo",
    steps: [
      "Войдите в свой аккаунт на сайте Nintendo.",
      "Откройте раздел «Redeem Code» и введите приобретённый код.",
      "Подтвердите — средства зачислятся на ваш счёт.",
    ],
  },
];

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Что такое карта Nintendo eShop?",
    a: "Карта Nintendo eShop пополняет баланс вашего аккаунта Nintendo. Деньги на балансе можно потратить на игры в eShop и любые подписки.",
  },
  {
    q: "Как поменять регион аккаунта Nintendo?",
    a: "Войдите в свой аккаунт на сайте Nintendo, откройте настройки. Нажмите «Изменить» в информации об аккаунте и выберите страну, соответствующую региону карты. Менять язык не нужно. Нажмите «Сохранить», а затем «Подтвердить». Зайдите в eShop, выберите пункт «Enter Code», введите купленный код активации. Нажмите «A» и получите деньги на счёт.",
  },
  {
    q: "Как не переплачивать налог при смене региона на США?",
    a: "Если при смене региона у вас спрашивают индекс, укажите любой из этих: 97080, 97116, 97222, 03222, 97330. Это индексы, которые не облагаются налогом США, — и вам не придётся тратить лишние деньги.",
  },
  {
    q: "Не пришёл код?",
    a: "Напишите в поддержку, мы поможем разобраться.",
  },
];

export default function NintendoActivationGuide() {
  return (
    <div className="mt-14 md:mt-20">
      <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
        Инструкция по активации
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
        После оплаты вы получите цифровой код. Активировать его можно с консоли
        или через сайт — выберите удобный способ.
      </p>

      {/* Methods */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {METHODS.map((m) => (
          <div
            key={m.n}
            className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-sm font-extrabold text-[var(--ink)]">
                {m.n}
              </span>
              <h3 className="font-bold text-[var(--ink)]">{m.title}</h3>
            </div>
            <ol className="mt-4 space-y-2.5 text-sm leading-6 text-[var(--text-muted)]">
              {m.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="font-bold text-[var(--ink)]">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Important */}
      <ImportantNote />

      {/* FAQ */}
      <FaqAccordion items={FAQ} />
    </div>
  );
}
