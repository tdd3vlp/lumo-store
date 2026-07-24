"use client";

import { useEffect, useState } from "react";
import { CODE_REVEAL_WARNING } from "@/lib/audit/constants";

type CodeRevealModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the customer confirms with the box checked. */
  onReveal: () => void;
  loading: boolean;
  error: string | null;
};

export default function CodeRevealModal({
  open,
  onOpenChange,
  onReveal,
  loading,
  error,
}: CodeRevealModalProps) {
  // The parent mounts this only while open, so `accepted` starts fresh each time.
  const [accepted, setAccepted] = useState(false);

  // Body-scroll lock with scrollbar compensation (mirrors AuthModal).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-[var(--ink)]/62 backdrop-blur-sm"
        onClick={() => !loading && onOpenChange(false)}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="code-reveal-title"
        className="relative w-full max-w-[560px] rounded-[30px] border border-white/70 bg-[var(--paper-strong)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.30)] sm:p-8"
      >
        <h2
          id="code-reveal-title"
          className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)] sm:text-3xl"
        >
          {CODE_REVEAL_WARNING.title}
        </h2>

        <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          {CODE_REVEAL_WARNING.body.map((line, i) => (
            <p key={i} className={i === 0 ? "font-semibold text-[var(--ink)]" : undefined}>
              {line}
            </p>
          ))}
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[16px] border border-[var(--line-strong)] bg-[var(--paper)] p-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={loading}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--signal-strong)]"
          />
          <span className="text-sm font-semibold leading-6 text-[var(--ink)]">
            {CODE_REVEAL_WARNING.checkbox}
          </span>
        </label>

        {error && (
          <p className="mt-4 text-sm font-semibold text-[var(--coral)]">{error}</p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-[13px] border border-[var(--line-strong)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50"
          >
            {CODE_REVEAL_WARNING.cancelLabel}
          </button>
          <button
            type="button"
            onClick={onReveal}
            disabled={!accepted || loading}
            className="rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Проверка…" : CODE_REVEAL_WARNING.revealLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
