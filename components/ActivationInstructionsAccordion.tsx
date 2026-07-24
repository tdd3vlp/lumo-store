import type { ReactNode } from "react";
import { ChevronIcon } from "@/components/FaqAccordion";

// Unified, collapsible "Инструкция по активации" block — same disclosure
// chrome as FaqAccordion (native <details>, no client JS), so a purchase
// page's activation steps don't add height until the buyer opens them.
export default function ActivationInstructionsAccordion({
  intro,
  children,
}: {
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 [&_summary::-webkit-details-marker]:hidden md:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
          Инструкция по активации
        </h2>
        <ChevronIcon />
      </summary>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] md:text-base md:leading-7">
        {intro}
      </p>
      <div className="mt-6">{children}</div>
    </details>
  );
}
