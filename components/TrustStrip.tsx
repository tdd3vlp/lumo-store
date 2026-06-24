const items = [
  {
    label: "Бонусная система",
    detail: "Копи бонусы с каждой покупки",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M12 3l7 4v5c0 4.5-3.1 8.7-7 10C5.1 20.7 2 16.5 2 12V7l10-4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Моментальная доставка",
    detail: "Отправим на почту сразу после оплаты",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M13 3L4 14h7l-1 7 9-11h-7l1-7Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Выгодные цены",
    detail: "Регулярные скидки и предложения",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M12 2l2.9 6.1L22 9.3l-5 5 1.2 7L12 18l-6.2 3.3 1.2-7-5-5 7.1-1.2L12 2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Дружелюбная поддержка",
    detail: "Готовы помочь на любом этапе покупки",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] px-3 py-3 md:px-4 md:py-4"
          >
            <span className="shrink-0 text-[var(--text-muted)] mt-0.5">
              {item.icon}
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text)] leading-tight">
                {item.label}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug hidden md:block">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
