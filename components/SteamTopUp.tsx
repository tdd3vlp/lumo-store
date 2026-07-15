"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaSteam } from "react-icons/fa6";
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
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3Zm-1 13-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z" />
    </svg>
  );
}

// Dark-surface inputs for the tinted Steam block.
const FIELD_CLASS =
  "mt-1.5 w-full rounded-[14px] border border-white/15 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[var(--signal)]";
const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-white/50";

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
    <div className="relative overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-10 text-white md:px-10 md:py-12">
      <div className="relative grid items-center gap-10 md:grid-cols-2 md:gap-8">
        {/* Left: header + form */}
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">
            <FaSteam className="h-4 w-4" />
            Steam
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] md:text-5xl">
            Пополнение
            <br />
            Steam
          </h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-white/60">
            Введите логин и сумму — деньги зачислятся на баланс Steam.
          </p>

          <div className="mt-7 space-y-4">
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

            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
              <div>
                <label htmlFor="steam-amount" className={LABEL_CLASS}>
                  Сумма
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
                  className={`${FIELD_CLASS} cursor-pointer [&>option]:text-[var(--ink)]`}
                >
                  {TOPUP_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live validation status */}
          <div className="mt-3 min-h-5 text-sm" aria-live="polite">
            {status === "checking" && (
              <span className="inline-flex items-center gap-2 text-white/60">
                <SpinnerIcon /> Проверяем аккаунт…
              </span>
            )}
            {status === "ok" && (
              <span className="inline-flex items-center gap-2 font-semibold text-[var(--signal)]">
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
              <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-white">
                {priceMinor != null ? formatRubles(priceMinor) : "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!canPay}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              Перейти к оплате
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        {/* Right: Steam card with lime glow + floating badges */}
        <div className="relative hidden min-h-[320px] items-center justify-center md:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute h-[280px] w-[280px] rounded-full bg-[var(--signal)] opacity-25 blur-[90px]"
          />
          <div
            className="relative h-[300px] w-[225px]"
            style={{ transform: "rotate(-6deg)", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))" }}
          >
            <Image src="/banners/steam.png" alt="Steam" fill sizes="225px" className="object-contain" priority />
          </div>

          <span className="absolute left-1 top-12 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            <BoltIcon className="h-4 w-4 text-[var(--signal)]" />
            Мгновенная доставка
          </span>
          <span className="absolute bottom-14 right-0 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldIcon className="h-4 w-4 text-[var(--signal)]" />
            Безопасно
          </span>
        </div>
      </div>
    </div>
  );
}
