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
  const visible = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:px-4">
      <div className="mx-auto flex max-w-sm flex-col items-start gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--paper-strong)] p-3 shadow-[0_10px_24px_rgba(0,0,0,0.16)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Мы используем cookie для работы сайта. Подробнее — в{" "}
          <Link href="/privacy" className="font-semibold text-[var(--ink)]">
            политике конфиденциальности
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 self-stretch rounded-full bg-[var(--signal-strong)] px-4 py-1.5 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] sm:self-auto"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
