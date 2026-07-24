// Activation instructions + FAQ for the App Store page. Static content — the
// FAQ uses native <details> so it expands without any client JS. The redeem
// steps are Apple's own flow, kept verbatim including the RU | EN button labels
// users actually see in a US-region store.

import ActivationInstructionsAccordion from "@/components/ActivationInstructionsAccordion";
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
    q: "Карта другого региона подойдёт к моему аккаунту?",
    a: "Нет. Регион карты должен совпадать с регионом учётной записи.",
  },
  {
    q: "Не пришёл код?",
    a: "Напишите в поддержку, мы поможем разобраться.",
  },
];

export default function AppleActivationGuide() {
  return (
    <div className="mt-14 md:mt-10">
      {/* Important */}
      <ImportantNote />

      <ActivationInstructionsAccordion intro="Войдите в свою учётную запись региона США или создайте её. Дальше активируйте код наиболее удобным способом.">
        <div className="grid gap-4 md:grid-cols-2">
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
