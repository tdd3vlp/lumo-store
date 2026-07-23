"use client";

import { useEffect, useState } from "react";
import {
  type TopUpCurrency,
  isValidSteamLogin,
} from "@/lib/products/steam-topup";

export type QuoteResult =
  | { kind: "ok"; priceMinor: number }
  | { kind: "found" }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export type QuoteStatus = "idle" | "invalid" | "checking" | QuoteResult["kind"];

export type SteamTopUpQuoteState = {
  status: QuoteStatus;
  /** Human message when status === "error". */
  errorMessage: string | null;
  /** Account verified and the amount priced — safe to proceed to payment. */
  canPay: boolean;
  /** Customer price in ruble minor units when canPay. */
  priceMinor: number | null;
  amountNum: number;
};

/**
 * Live Steam login validation + price quote, shared by the home-page form and
 * the checkout form. Debounced against /api/steam/check-login; setState happens
 * only in the async callback, and the result is tagged with its request key so
 * the render can tell a fresh answer from a stale one and derive
 * checking/idle without storing them.
 */
export function useSteamTopUpQuote(
  login: string,
  amount: string,
  currency: TopUpCurrency,
): SteamTopUpQuoteState {
  const [result, setResult] = useState<{ key: string; data: QuoteResult } | null>(null);

  const amountNum = Number(amount);
  const loginValid = isValidSteamLogin(login);
  const amountReady = Number.isInteger(amountNum) && amountNum > 0;
  // The account check runs on a valid login alone — the price also needs the
  // amount, but the buyer should see "найден / не найден" without entering a sum.
  const currentKey = `${login.trim()}|${amountReady ? amountNum : 0}|${currency}`;

  useEffect(() => {
    if (!loginValid) return;
    const key = currentKey;
    const controller = new AbortController();
    // NS.gifts occasionally flakes on the first call after a cold start. Retry a
    // couple of times behind the "Проверяем…" spinner before showing an error,
    // so a correct login isn't wrongly reported as unverifiable.
    const MAX_ATTEMPTS = 3;
    const timer = setTimeout(async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const res = await fetch("/api/steam/check-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // amount 0 when the buyer hasn't typed one yet: the API still runs
            // the live account check and reports found / not-found.
            body: JSON.stringify({
              login: login.trim(),
              amount: amountReady ? amountNum : 0,
              currency,
            }),
            signal: controller.signal,
          });
          const data = await res.json();
          if (data.canRefill && typeof data.priceMinor === "number") {
            setResult({ key, data: { kind: "ok", priceMinor: data.priceMinor } });
            return;
          }
          if (data.error === "Аккаунт не найден.") {
            setResult({ key, data: { kind: "not_found" } });
            return;
          }
          // Account exists (min/max present) but no usable amount yet: show
          // "found" when the buyer hasn't entered a sum, or the range error when
          // the sum they typed is out of bounds.
          if (typeof data.min === "number") {
            setResult({
              key,
              data: amountReady
                ? {
                    kind: "error",
                    message:
                      data.error ?? `Сумма должна быть от ${data.min} до ${data.max}.`,
                  }
                : { kind: "found" },
            });
            return;
          }
          // Transient/unknown error — retry, surface only after the last attempt.
          if (attempt === MAX_ATTEMPTS - 1) {
            setResult({ key, data: { kind: "error", message: data.error ?? "Не удалось проверить логин." } });
            return;
          }
        } catch {
          if (controller.signal.aborted) return;
          if (attempt === MAX_ATTEMPTS - 1) {
            setResult({
              key,
              data: { kind: "error", message: "Не удалось проверить логин. Попробуйте позже." },
            });
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 700));
        if (controller.signal.aborted) return;
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currentKey, loginValid, amountReady, login, amountNum, currency]);

  const shown = loginValid && result?.key === currentKey ? result.data : null;
  const status: QuoteStatus =
    login.trim() === ""
      ? "idle"
      : !loginValid
        ? "invalid"
        : shown
          ? shown.kind
          : "checking";

  return {
    status,
    errorMessage: shown?.kind === "error" ? shown.message : null,
    canPay: shown?.kind === "ok",
    priceMinor: shown?.kind === "ok" ? shown.priceMinor : null,
    amountNum,
  };
}
