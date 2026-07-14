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
    const [account, fxResponse, pricing] = await Promise.all([
      stub ? { accountStatus: stub.accountStatusFor(login) } : checkSteamUser(login),
      stub ? { rates: stub.fx } : getExchangeRate(STEAM_TOPUP_SERVICE_ID),
      getNsPricing(),
    ]);

    const fx: FxRates = fxResponse.rates;
    const { min, max } = topUpBounds(input.currency, fx);

    if (!account.accountStatus) {
      return { ...empty, min, max, canRefill: false, error: "Аккаунт не найден." };
    }
    if (!isValidTopUpAmount(input.amount, input.currency, fx)) {
      return { ...empty, min, max, error: `Сумма должна быть от ${min} до ${max}.` };
    }

    const amountUsd = amountToUsd(input.amount, input.currency, fx);
    const priceMinor = priceMinorFromUsd(amountUsd, pricing.rate, pricing.markupBps);
    return { canRefill: true, amountUsd, priceMinor, min, max, error: null };
  } catch {
    return { ...empty, error: GENERIC_ERROR };
  }
}
