import "server-only";
import { checkSteamUser, getExchangeRate } from "@/lib/ns-gifts/client";
import { getNsPricing } from "@/lib/products/pricing";
import {
  type FxRates,
  type TopUpCurrency,
  STEAM_TOPUP_SERVICE_ID,
  amountToUsd,
  isValidSteamLogin,
  isValidTopUpAmount,
  priceMinorFromUsd,
  topUpBounds,
} from "@/lib/products/steam-topup";

export type SteamTopUpQuote = {
  canRefill: boolean;
  amountUsd: number | null;
  priceMinor: number | null;
  min: number | null;
  max: number | null;
  error: string | null;
};

const GENERIC_ERROR = "Не удалось проверить логин Steam. Попробуйте позже.";

// The form validates on every keystroke, so without caching a single user would
// hammer NS.gifts (which then rate-limits / flakes). Cache the two upstream
// reads that don't vary per request: the daily FX table, and a login's
// existence for a short window. This collapses a burst of checks into one NS
// round-trip and removes the intermittent "попробуйте позже" flakiness.
const FX_TTL_MS = 30 * 60 * 1000;
const ACCOUNT_TTL_MS = 60 * 1000;
const fxCache = new Map<number, { at: number; rates: FxRates }>();
const accountCache = new Map<string, { at: number; status: boolean }>();

// NS.gifts occasionally drops a request (rate-limit / cold token); one retry
// turns most of those transient failures into a success.
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

async function cachedFx(serviceId: number): Promise<FxRates> {
  const hit = fxCache.get(serviceId);
  if (hit && Date.now() - hit.at < FX_TTL_MS) return hit.rates;
  const { rates } = await retryOnce(() => getExchangeRate(serviceId));
  fxCache.set(serviceId, { at: Date.now(), rates });
  return rates;
}

async function cachedCheckUser(login: string): Promise<boolean> {
  const now = Date.now();
  const hit = accountCache.get(login);
  if (hit && now - hit.at < ACCOUNT_TTL_MS) return hit.status;
  const { accountStatus } = await retryOnce(() => checkSteamUser(login));
  if (accountCache.size > 2000) {
    for (const [key, v] of accountCache) {
      if (now - v.at >= ACCOUNT_TTL_MS) accountCache.delete(key);
    }
  }
  accountCache.set(login, { at: now, status: accountStatus });
  return accountStatus;
}

// NS.gifts is IP-whitelisted, so its API is unreachable from a dev machine.
// With STEAM_TOPUP_DEV_STUB=1 we stub the account check + FX so the flow can be
// exercised locally; it is never consulted in production.
function devStub(): { accountStatusFor: (l: string) => boolean; fx: FxRates } | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.STEAM_TOPUP_DEV_STUB !== "1") return null;
  return {
    // Treat a short allowlist as "existing" so the happy path is reachable.
    accountStatusFor: (login) => ["tdtoha", "test_account", "valve"].includes(login),
    fx: { rub: 76.61, uah: 44.55, kzt: 475.69 },
  };
}

/**
 * Validates a Steam login live against NS.gifts and prices a top-up. Returns a
 * nebula-style result the form and checkout both consume. Never throws — an
 * unreachable API or a not-found account both come back as canRefill:false.
 */
export async function quoteSteamTopUp(input: {
  login: string;
  amount: number;
  currency: TopUpCurrency;
}): Promise<SteamTopUpQuote> {
  const login = input.login.trim();
  const empty: SteamTopUpQuote = {
    canRefill: false,
    amountUsd: null,
    priceMinor: null,
    min: null,
    max: null,
    error: null,
  };

  if (!isValidSteamLogin(login)) {
    return { ...empty, error: "Некорректный логин Steam." };
  }

  const stub = devStub();
  try {
    const [accountStatus, fx, pricing] = await Promise.all([
      stub ? stub.accountStatusFor(login) : cachedCheckUser(login),
      stub ? stub.fx : cachedFx(STEAM_TOPUP_SERVICE_ID),
      getNsPricing(),
    ]);

    const { min, max } = topUpBounds(input.currency, fx);

    if (!accountStatus) {
      return { ...empty, min, max, canRefill: false, error: "Аккаунт не найден." };
    }
    if (!isValidTopUpAmount(input.amount, input.currency, fx)) {
      return { ...empty, min, max, error: `Сумма должна быть от ${min} до ${max}.` };
    }

    // Price off NS.gifts' own official USD→RUB rate (not a hand-maintained
    // rate), so we only add our top-up markup on top — a ruble top-up is exactly
    // amount × (1 + markup), with no hidden FX spread.
    const amountUsd = amountToUsd(input.amount, input.currency, fx);
    const priceMinor = priceMinorFromUsd(amountUsd, fx.rub, pricing.topupMarkupBps);
    return { canRefill: true, amountUsd, priceMinor, min, max, error: null };
  } catch {
    return { ...empty, error: GENERIC_ERROR };
  }
}

export type SteamTopUpPrice = {
  ok: boolean;
  amountUsd: number | null;
  priceMinor: number | null;
  min: number | null;
  max: number | null;
  error: string | null;
};

/**
 * Prices a top-up WITHOUT re-checking the account. The form already validated
 * the login live, and payment re-checks it just before charging, so the
 * checkout page only needs the price — recomputed server-side from the (cached)
 * official FX rate so it never trusts a tampered query, and never flakes on the
 * per-account Steam lookup.
 */
export async function priceSteamTopUp(input: {
  amount: number;
  currency: TopUpCurrency;
}): Promise<SteamTopUpPrice> {
  const empty: SteamTopUpPrice = {
    ok: false,
    amountUsd: null,
    priceMinor: null,
    min: null,
    max: null,
    error: null,
  };
  const stub = devStub();
  try {
    const [fx, pricing] = await Promise.all([
      stub ? stub.fx : cachedFx(STEAM_TOPUP_SERVICE_ID),
      getNsPricing(),
    ]);
    const { min, max } = topUpBounds(input.currency, fx);
    if (!isValidTopUpAmount(input.amount, input.currency, fx)) {
      return { ...empty, min, max, error: `Сумма должна быть от ${min} до ${max}.` };
    }
    const amountUsd = amountToUsd(input.amount, input.currency, fx);
    const priceMinor = priceMinorFromUsd(amountUsd, fx.rub, pricing.topupMarkupBps);
    return { ok: true, amountUsd, priceMinor, min, max, error: null };
  } catch {
    return { ...empty, error: GENERIC_ERROR };
  }
}
