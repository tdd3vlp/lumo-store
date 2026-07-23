// Activation instructions + FAQ for the App Store page. Static content — the
// FAQ uses native <details> so it expands without any client JS. The redeem
// steps are Apple's own flow, kept verbatim including the RU | EN button labels
// users actually see in a US-region store.

import FaqAccordion from "@/components/FaqAccordion";
import ImportantNote from "@/components/ImportantNote";

const METHODS: Array<{ n: number; title: string; steps: string[] }> = [
  {
    n: 1,
    title: "На iPhone, iPod, iPad",
    steps: [
      "Откройте App Store.",
      "Войдите в свою учётную запись или нажмите на фото профиля.",
      "Нажмите «Погасить подарочную карту или код | Redeem Gift Card or Code».",
      "Нажмите «Ввести код вручную | Enter Code Manually» и вставьте код.",
      "Нажмите «Активировать | Redeem».",
    ],
  },
  {
    n: 2,
    title: "На компьютере Mac",
    steps: [
      "Откройте App Store.",
      "Нажмите своё имя или кнопку входа на боковой панели.",
      "Нажмите «Погасить подарочную карту или код | Redeem Gift Card or Code».",
      "Нажмите «Ввести код вручную | Enter Code Manually» и вставьте код.",
      "Нажмите «Активировать | Redeem».",
    ],
  },
];

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Что такое Apple Gift Card?",
    a: "Apple Gift Card пополняет баланс вашего Apple ID. С него можно оплачивать приложения и игры в App Store, подписки — Apple Music, iCloud+, Apple TV+, Arcade — а также покупки внутри приложений.",
  },
  {
    q: "Как создать учётную запись региона США?",
    a: "Выйдите из текущего Apple ID, откройте App Store и нажмите «Создать новый Apple ID». В качестве страны укажите США, а в способе оплаты выберите «Нет | None» — тогда карта не потребуется. Для адреса подойдёт любой реальный адрес в США.",
  },
  {
    q: "Карта другого региона подойдёт к моему аккаунту?",
    a: "Нет. Регион карты должен совпадать с регионом учётной записи: карта США активируется только на аккаунте США, карта Турции — только на турецком.",
  },
  {
    q: "Не пришёл код?",
    a: "Напишите в поддержку, мы поможем разобраться.",
  },
];

export default function AppleActivationGuide() {
  return (
    <div className="mt-14 md:mt-20">
      <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
        Инструкция по активации кода
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
        Войдите в свою учётную запись региона США или создайте её. Дальше
        активируйте код тем способом, который вам удобнее.
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
