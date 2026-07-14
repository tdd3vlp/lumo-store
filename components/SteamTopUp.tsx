"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatRubles } from "@/lib/pricing/rates";
import {
  type TopUpCurrency,
  TOPUP_CURRENCIES,
  isValidSteamLogin,
} from "@/lib/products/steam-topup";

type QuoteResult =
  | { kind: "ok"; priceMinor: number }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FIELD_CLASS =
  "mt-1.5 w-full rounded-[14px] border border-[var(--line-strong)] bg-white px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--ink)]";
const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]";

export default function SteamTopUp() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<TopUpCurrency>("RUB");
  const [result, setResult] = useState<{ key: string; data: QuoteResult } | null>(null);

  const amountNum = Number(amount);
  const loginValid = isValidSteamLogin(login);
  const inputsReady = loginValid && Number.isInteger(amountNum) && amountNum > 0;
  const currentKey = `${login.trim()}|${amountNum}|${currency}`;

  // Live validate against NS.gifts (debounced). setState happens only in the
  // async callback; the result is tagged with its request key so the render
  // can tell a fresh answer from a stale one and derive checking/idle without
  // storing them.
  useEffect(() => {
    if (!inputsReady) return;
    const key = currentKey;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/steam/check-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: login.trim(), amount: amountNum, currency }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.canRefill && typeof data.priceMinor === "number") {
          setResult({ key, data: { kind: "ok", priceMinor: data.priceMinor } });
        } else if (data.error === "Аккаунт не найден.") {
          setResult({ key, data: { kind: "not_found" } });
        } else {
          setResult({ key, data: { kind: "error", message: data.error ?? "Не удалось проверить логин." } });
        }
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key, data: { kind: "error", message: "Не удалось проверить логин. Попробуйте позже." } });
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentKey, inputsReady, login, amountNum, currency]);

  const shown = inputsReady && result?.key === currentKey ? result.data : null;
  const status: "idle" | "checking" | QuoteResult["kind"] = !inputsReady
    ? "idle"
    : shown
      ? shown.kind
      : "checking";
  const canPay = shown?.kind === "ok";
  const priceMinor = shown?.kind === "ok" ? shown.priceMinor : null;

  function submit() {
    if (!canPay) return;
    const params = new URLSearchParams({ login: login.trim(), amount: String(amountNum), currency });
    router.push(`/steam/checkout?${params.toString()}`);
  }

  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 md:p-8">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--signal-strong)]" aria-hidden="true" />
        <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
          Пополнение Steam
        </h2>
      </div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Введите логин и сумму — деньги зачислятся на баланс Steam.
      </p>

      {/* Login · amount · currency, all on one row (stacks on mobile) */}
      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_128px]">
        <div>
          <label htmlFor="steam-login" className={LABEL_CLASS}>
            Steam логин
          </label>
          <input
            id="steam-login"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Ваш логин в Steam"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="steam-amount" className={LABEL_CLASS}>
            Сумма пополнения
          </label>
          <input
            id="steam-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="steam-currency" className={LABEL_CLASS}>
            Валюта
          </label>
          <select
            id="steam-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as TopUpCurrency)}
            className={`${FIELD_CLASS} cursor-pointer`}
          >
            {TOPUP_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live validation status */}
      <div className="mt-3 min-h-5 text-sm" aria-live="polite">
        {status === "checking" && (
          <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
            <SpinnerIcon /> Проверяем аккаунт…
          </span>
        )}
        {status === "ok" && (
          <span className="inline-flex items-center gap-2 font-semibold text-[#1e8a4c]">
            <CheckIcon /> Аккаунт найден
          </span>
        )}
        {status === "not_found" && (
          <span className="font-semibold text-[var(--coral)]">Аккаунт не найден</span>
        )}
        {status === "error" && shown?.kind === "error" && (
          <span className="text-[var(--coral)]">{shown.message}</span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={LABEL_CLASS}>Итого к оплате</p>
          <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
            {priceMinor != null ? formatRubles(priceMinor) : "—"}
          </p>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canPay}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] disabled:cursor-not-allowed disabled:bg-[var(--line)] disabled:text-[var(--text-muted)]"
        >
          Перейти к оплате
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
