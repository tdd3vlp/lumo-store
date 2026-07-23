"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lumo-cookie-notice-dismissed";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) !== "1";
}

// Server has no localStorage; render nothing there and let the client decide
// after hydration, so there's no mismatch or flash of the banner.
function getServerSnapshot() {
  return false;
}

function dismiss() {
  localStorage.setItem(STORAGE_KEY, "1");
  listeners.forEach((notify) => notify());
}

// One-time cookie-usage notice (152-ФЗ requires informing the user; our
// cookies are strictly functional — auth session — so a simple acknowledgement
// is enough, not a full consent manager with granular toggles).
export default function CookieNotice() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--paper-strong)] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)] sm:flex-row sm:items-center sm:justify-between md:p-5">
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Мы используем cookie для работы сайта и вашей авторизации. Подробнее — в{" "}
          <Link
            href="/privacy"
            className="font-semibold text-[var(--ink)] underline underline-offset-2"
          >
            политике конфиденциальности
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 self-stretch rounded-full bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] sm:self-auto"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
