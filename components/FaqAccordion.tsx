import type { ReactNode } from "react";

// Shared "Вопросы и ответы" accordion for the activation guides. Native
// <details> so it expands without client JS; the chevron rotates via the
// `open:` variant. Each guide passes its own items.
function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FaqAccordion({
  items,
}: {
  items: Array<{ q: string; a: ReactNode }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
        Вопросы и ответы
      </h2>
      <div className="mt-5 space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-[16px] border border-[var(--line)] bg-[var(--paper-strong)] px-5 py-1 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold text-[var(--ink)]">
              {item.q}
              <ChevronIcon />
            </summary>
            <p className="pb-4 text-sm leading-7 text-[var(--text-muted)]">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
