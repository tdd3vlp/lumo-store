// Activation instructions + FAQ for the Xbox page. Static content — the FAQ
// uses native <details> so it expands without any client JS. Facts (redeem URL,
// 25-digit code, console/app steps) are kept as-is; wording is our own.

import ActivationInstructionsAccordion from "@/components/ActivationInstructionsAccordion";
import FaqAccordion from "@/components/FaqAccordion";
import ImportantNote from "@/components/ImportantNote";

const METHODS: Array<{ n: number; title: string; steps: string[] }> = [
  {
    n: 1,
    title: "На сайте Xbox",
    steps: [
      "Перейдите на страницу redeem.microsoft.com и войдите в свою учётную запись Microsoft.",
      "Введите 25-значный код в соответствующее поле и нажмите «Применить».",
      "Средства автоматически зачислятся на баланс.",
    ],
  },
  {
    n: 2,
    title: "На консоли Xbox",
    steps: [
      "Нажмите кнопку Xbox на геймпаде и перейдите в раздел «Магазин».",
      "Откройте вкладку «Активировать» или выберите пункт «Использовать код».",
      "Введите 25-значный код вручную или отсканируйте QR-код камерой смартфона — средства зачислятся на баланс.",
    ],
  },
  {
    n: 3,
    title: "Через приложение Xbox на ПК или смартфоне",
    steps: [
      "Откройте приложение Xbox и войдите в учётную запись Microsoft.",
      "Нажмите на иконку профиля, выберите «Активировать код».",
      "Введите код, подтвердите активацию.",
    ],
  },
];

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Что такое подарочная карта Xbox?",
    a: "Подарочные карты Xbox — быстрый и удобный способ пополнить баланс вашего аккаунта Xbox, чтобы покупать игры, дополнительный контент и другие товары в магазине Microsoft.",
  },
  {
    q: "Как поменять регион аккаунта Xbox?",
    a: "Нажмите кнопку Xbox на контроллере, выберите «Профиль и система» → «Параметры» → «Система» → «Язык и местонахождение». Выберите новую страну или регион в раскрывающемся списке в разделе «Местонахождение».",
  },
  {
    q: "Не пришёл код?",
    a: "Напишите в поддержку, мы поможем разобраться.",
  },
];

export default function XboxActivationGuide() {
  return (
    <div className="mt-14 md:mt-10">
      {/* Important */}
      <ImportantNote />

      <ActivationInstructionsAccordion intro="После оплаты вы получите 25-значный цифровой код. Активировать его можно несколькими способами — выбирайте наиболее удобный.">
        <div className="grid gap-4 md:grid-cols-3">
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
      </ActivationInstructionsAccordion>

      {/* FAQ */}
      <FaqAccordion items={FAQ} />
    </div>
  );
}
