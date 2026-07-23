// PlayStation activation instructions + FAQ. Static content — shown on the
// PlayStation purchase page and on /instructions/playstation. Facts (where to
// tap, «Redeem Code», store.playstation.com) are kept as-is; wording is our own.

import FaqAccordion from "@/components/FaqAccordion";
import ImportantNote from "@/components/ImportantNote";

const CONSOLE: Array<{ title: string; steps: string[] }> = [
  {
    title: "PlayStation 5",
    steps: [
      "Зайдите в свой аккаунт и откройте PS Store.",
      "Нажмите на три точки в верхнем правом углу.",
      "Выберите «Redeem Code».",
      "Введите код.",
      "Нажмите «Redeem» — готово!",
    ],
  },
  {
    title: "PlayStation 4",
    steps: [
      "Зайдите в свой аккаунт и откройте PS Store.",
      "Пролистайте вниз до пункта «Redeem Code».",
      "Выберите «Redeem Code».",
      "Введите код.",
      "Нажмите «Continue» — готово!",
    ],
  },
];

const SITE: string[] = [
  "Перейдите на сайт PlayStation: store.playstation.com.",
  "Зайдите в свой аккаунт.",
  "Нажмите на фотографию профиля в верхнем правом углу.",
  "Выберите «Redeem Code».",
  "Введите код.",
  "Нажмите «Redeem» — готово!",
];

// Placeholder Q&A — to be edited manually.
const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Что такое карты пополнения PlayStation?",
    a: "Подарочные карты пополнения PlayStation — удобный способ пополнить кошелёк PSN, чтобы покупать игры, дополнения, подписки и другой контент в PlayStation Store.",
  },
  {
    q: "Как поменять регион аккаунта PlayStation?",
    a: "На PlayStation нельзя изменить регион уже созданного аккаунта. Если у вас нет аккаунта нужного региона, вы можете приобрести его у нас на сайте.",
  },
  {
    q: "Не пришёл код?",
    a: "Напишите в поддержку, мы поможем разобраться.",
  },
];

function StepCard({ title, steps }: { title?: string; steps: string[] }) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] p-5">
      {title && <p className="mb-3 font-bold text-[var(--ink)]">{title}</p>}
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-6 text-[var(--text-muted)]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-[11px] font-bold text-[var(--ink)]">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PlayStationActivationGuide() {
  return (
    <div className="mt-14 md:mt-20">
      <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
        Как активировать код PlayStation
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        После оплаты вы получите цифровой код. Активировать его можно с консоли или через сайт —
        выберите удобный способ.
      </p>

      <p className="mt-6 text-sm font-bold text-[var(--ink)]">С консоли PlayStation</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {CONSOLE.map((block) => (
          <StepCard key={block.title} title={block.title} steps={block.steps} />
        ))}
      </div>

      <p className="mt-6 text-sm font-bold text-[var(--ink)]">Через сайт PlayStation</p>
      <div className="mt-3">
        <StepCard steps={SITE} />
      </div>

      <ImportantNote />

      <FaqAccordion items={FAQ} />
    </div>
  );
}
