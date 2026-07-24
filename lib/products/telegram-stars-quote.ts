import "server-only";
import { computeNsPriceMinor, getNsPricing } from "./pricing";
import {
  type StarDenomination,
  STAR_DENOMINATIONS,
  findDenomination,
  isValidTelegramUsername,
  normalizeTelegramUsername,
} from "./telegram-stars";

export type PricedDenomination = StarDenomination & { priceMinor: number };

/**
 * The 8 fixed packages priced in ruble minor units: each USD cost run through
 * the global NS.gifts USD→RUB rate + markup (one settings read for all of them).
 * Computed server-side and handed to the form so the client never needs the
 * rate.
 */
export async function pricedDenominations(): Promise<PricedDenomination[]> {
  const pricing = await getNsPricing();
  // Telegram Stars is a wallet top-up → priced with the top-up markup, not the
  // gift-card markup.
  const markup = { rate: pricing.rate, markupBps: pricing.topupMarkupBps };
  return STAR_DENOMINATIONS.map((d) => ({
    ...d,
    priceMinor: computeNsPriceMinor(d.costUsd, markup),
  }));
}

/** Price for one denomination (checkout re-prices server-side, never trusting the query). */
export async function priceStars(stars: number): Promise<number | null> {
  const d = findDenomination(stars);
  if (!d) return null;
  const pricing = await getNsPricing();
  return computeNsPriceMinor(d.costUsd, { rate: pricing.rate, markupBps: pricing.topupMarkupBps });
}

export type UsernameCheck = {
  /** Format is a valid Telegram username. */
  valid: boolean;
  /** true = public profile resolved, false = no such handle, null = couldn't tell. */
  exists: boolean | null;
  error: string | null;
};

/**
 * Best-effort recipient existence check. NS.gifts doesn't validate the account,
 * so we resolve the public Telegram profile at t.me/<username>: a real public
 * user/channel/bot renders a profile block (`tgme_page_title`); an unknown or
 * free handle renders the generic Telegram landing without one. This is a SOFT
 * signal — on any network/parse ambiguity we return exists:null (don't block),
 * since NS.gifts is the source of truth at fulfilment.
 */
export async function checkTelegramUsername(input: string): Promise<UsernameCheck> {
  const username = normalizeTelegramUsername(input);
  if (!isValidTelegramUsername(username)) {
    return { valid: false, exists: null, error: "Некорректный username." };
  }
  try {
    const res = await fetch(`https://t.me/${username}`, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; LumoBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { valid: true, exists: null, error: null };
    const html = await res.text();
    // The "not found" landing has no profile title block; a resolvable profile
    // does. og:title is the display name for a real profile, "Telegram" for the
    // generic landing — used as a secondary guard.
    const hasProfile = html.includes("tgme_page_title");
    const og = html.match(/<meta property="og:title" content="([^"]*)"/i)?.[1]?.trim() ?? "";
    const exists = hasProfile && og !== "" && og.toLowerCase() !== "telegram";
    return { valid: true, exists, error: null };
  } catch {
    return { valid: true, exists: null, error: null };
  }
}
