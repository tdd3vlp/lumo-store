"use client";

import { useState } from "react";

// Kicks off a PayPalych checkout: posts the order to the create route and hands
// the browser to the returned hosted payment page. `body` names the checkout
// kind ("cart" | "steam" | "telegram") plus its fields.
export default function PayNowButton({
  body,
  label,
  disabled = false,
}: {
  body: Record<string, unknown>;
  label: string;
  /** Blocks the button while the parent form isn't ready to charge. */
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/paypalych/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey:
            globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
          ...body,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        payUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.payUrl) {
        setError(data?.error ?? "Не удалось перейти к оплате. Попробуйте ещё раз.");
        setBusy(false);
        return;
      }
      window.location.assign(data.payUrl);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={pay}
        disabled={busy || disabled}
        className="mt-6 w-full rounded-full bg-[var(--signal-strong)] px-6 py-4 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Переходим к оплате…" : label}
      </button>
      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        {error ? (
          <span className="text-[var(--coral)]">{error}</span>
        ) : (
          "Оплата картой или через СБП. После оплаты придёт подтверждение на почту."
        )}
      </p>
    </>
  );
}
