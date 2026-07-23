"use client";

import { useState } from "react";
import { discountedUnitMinor } from "@/lib/account/loyalty-discount";
import PayNowButton from "@/components/PayNowButton";
import { useSteamTopUpQuote } from "@/components/useSteamTopUpQuote";
import { formatRubles } from "@/lib/pricing/rates";
import {
  type TopUpCurrency,
  TOPUP_CURRENCIES,
} from "@/lib/products/steam-topup";

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
function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Light-surface inputs matching the checkout's paper cards.
const FIELD_CLASS =
  "mt-1.5 w-full rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3 text-[var(--ink)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]";
const LABEL_CLASS =
  "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]";

/**
 * Editable Steam top-up order form: the same login / amount / currency fields
 * as the home-page block, prefilled from the query string the home page sends,
 * re-validated live, priced server-side at payment.
 */
export default function SteamCheckoutForm({
  initialLogin,
  initialAmount,
  initialCurrency,
  discountBps = 0,
}: {
  initialLogin: string;
  initialAmount: string;
  initialCurrency: TopUpCurrency;
  /** Buyer's loyalty top-up discount, basis points (display only). */
  discountBps?: number;
}) {
  const [login, setLogin] = useState(initialLogin);
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState<TopUpCurrency>(initialCurrency);

  const { status, errorMessage, canPay, priceMinor, amountNum } =
    useSteamTopUpQuote(login, amount, currency);

  // Loyalty discount shown on the total (the charge is recomputed server-side).
  const chargeMinor =
    priceMinor != null ? discountedUnitMinor(priceMinor, discountBps) : null;
  const hasDiscount =
    discountBps > 0 && priceMinor != null && chargeMinor != null && chargeMinor < priceMinor;

  return (
    <>
      <section className="mt-8 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Данные для пополнения
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="min-w-[180px] flex-1">
            <label htmlFor="checkout-steam-login" className={LABEL_CLASS}>
              Steam логин
            </label>
            <input
              id="checkout-steam-login"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Ваш логин в Steam"
              className={FIELD_CLASS}
            />
          </div>
          <div className="w-[130px]">
            <label htmlFor="checkout-steam-amount" className={LABEL_CLASS}>
              Сумма
            </label>
            <input
              id="checkout-steam-amount"
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
          <div className="w-[120px]">
            <label htmlFor="checkout-steam-currency" className={LABEL_CLASS}>
              Валюта
            </label>
            <div className="relative mt-1.5">
              <select
                id="checkout-steam-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as TopUpCurrency)}
                className="w-full cursor-pointer appearance-none rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] py-3 pl-4 pr-9 text-[var(--ink)] outline-none transition focus:border-[var(--ink)]"
              >
                {TOPUP_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Live validation status */}
        <div className="mt-3 min-h-5 text-sm" aria-live="polite">
          {status === "invalid" && (
            <span className="text-[var(--text-muted)]">
              Введите логин Steam — латиница, цифры и «_». Это логин для входа,
              а не отображаемое имя.
            </span>
          )}
          {status === "checking" && (
            <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
              <SpinnerIcon /> Проверяем аккаунт…
            </span>
          )}
          {status === "found" && (
            <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
              <CheckIcon /> Аккаунт найден — укажите сумму
            </span>
          )}
          {status === "ok" && (
            <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
              <CheckIcon /> Аккаунт найден
            </span>
          )}
          {status === "not_found" && (
            <span className="font-semibold text-[var(--coral)]">
              Аккаунт не найден. Проверьте логин для входа (не отображаемое имя).
            </span>
          )}
          {status === "error" && errorMessage && (
            <span className="text-[var(--coral)]">{errorMessage}</span>
          )}
        </div>

        <div className="mt-4 border-t border-[var(--line)] pt-4">
          {hasDiscount && (
            <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--text-muted)]">
                Скидка постоянного покупателя −{(discountBps / 100).toLocaleString("ru-RU")}%
              </span>
              <span className="font-semibold text-[var(--text-muted)] line-through">
                {formatRubles(priceMinor!)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <p className={LABEL_CLASS}>Итого к оплате</p>
            <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)]">
              {chargeMinor != null ? formatRubles(chargeMinor) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] p-4 text-sm text-[var(--text-muted)]">
          <WarningIcon />
          <p>
            Удостоверьтесь, что Steam-логин верный.{" "}
            <span className="font-bold text-[var(--ink)]">Возврат средств невозможен</span>, если
            пополнили чужой аккаунт.
          </p>
        </div>
      </section>

      <PayNowButton
        body={{ kind: "steam", login: login.trim(), amount: amountNum, currency }}
        label={chargeMinor != null ? `Оплатить ${formatRubles(chargeMinor)}` : "Оплатить"}
        disabled={!canPay}
      />
    </>
  );
}
