import { FaTelegram } from "react-icons/fa6";

// Shared "Важно" block for the PlayStation and Xbox activation guides — same
// three points + a Telegram support button, so the near-identical markup lives
// in one place.
const POINTS = [
  "Убедитесь, что регион вашей учётной записи совпадает с регионом подарочной карты.",
  "Коды не подлежат обмену или возврату после оформления заказа.",
  "Если возникли вопросы — обратитесь в поддержку.",
];

export default function ImportantNote() {
  return (
    <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--card-surface)] p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">Важно</p>
      <ul className="mt-3 space-y-2.5 text-sm leading-6 text-[var(--ink)]">
        {POINTS.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal-strong)]"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <a
        href="https://t.me/lumocard"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--ink)]/90"
      >
        <FaTelegram className="h-4 w-4" />
        Написать в поддержку
      </a>
    </div>
  );
}
