"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

// Steps to find the account country on each surface. The PSN region is fixed at
// account creation and cannot be changed later — the guide leads with that so a
// customer knows a mismatched region means they need a different account.
const STEPS: Array<{ title: string; steps: string[] }> = [
  {
    title: "На сайте PlayStation",
    steps: [
      "Откройте сайт https://www.playstation.com и войдите в свою учётную запись.",
      "Нажмите на фотографию профиля в верхнем правом углу и выберите «Управление учётной записью | Account Management».",
      "Выберите «Ваша информация | Your Information», а затем «Изменить | Edit» и «Адрес проживания | Residential Address».",
    ],
  },
  {
    title: "На консоли PlayStation 5",
    steps: [
      "Откройте «Настройки | Settings».",
      "Выберите «Пользователи и учётные записи | Users and Accounts» → «Учётная запись | Account» → «Адрес | Address».",
    ],
  },
  {
    title: "На консоли PlayStation 4",
    steps: [
      "Откройте «Настройки | Settings» → «Управление учётной записью | Account Management».",
      "«Информация об учётной записи | Account Information» → «Адрес | Address».",
    ],
  },
];

export default function RegionGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-guide-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-[var(--paper)] p-6 shadow-2xl sm:rounded-[28px] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="region-guide-title"
            className="font-[family-name:var(--font-unbounded)] text-xl font-bold leading-tight tracking-[-0.02em] text-[var(--ink)]"
          >
            Как проверить регион аккаунта PlayStation
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink)]/60 transition hover:bg-[var(--card-surface)] hover:text-[var(--ink)]"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Регион задаётся при создании аккаунта и не меняется. Карта другого
          региона не активируется — убедитесь, что страна аккаунта совпадает с
          регионом карты.
        </p>

        <div className="mt-5 space-y-4">
          {STEPS.map((block) => (
            <div
              key={block.title}
              className="rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] p-4"
            >
              <p className="text-sm font-bold text-[var(--ink)]">
                {block.title}
              </p>
              <ol className="mt-2 space-y-1.5">
                {block.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm leading-6 text-[var(--text-muted)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-[11px] font-bold text-[var(--ink)]">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <p className="mt-5 rounded-[14px] bg-[var(--card-surface)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
          Подсказка: регион можно определить по валюте в PlayStation Store. Если
          цены отображаются в долларах ($) — аккаунт американский, в фунтах (£)
          — британский, и так далее.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-extrabold text-white transition hover:opacity-90"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body,
  );
}
