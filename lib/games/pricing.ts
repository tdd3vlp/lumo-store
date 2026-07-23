import "server-only";
import { getPublishedProducts } from "@/lib/products/storefront";
import {
  GAMES,
  GAME_REGION_CURRENCY,
  GAME_REGION_LABEL,
  sortEditions,
  type Game,
} from "./catalog";
import { listDbGames } from "./store";

const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  GBP: 2,
  EUR: 2,
  TRY: 0,
  INR: 0,
  PLN: 0,
};
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  GBP: "£",
  TRY: "₺",
  INR: "₹",
  PLN: "zł",
};

// Region banner used for the cards added to cart.
const REGION_BANNER: Record<string, string> = {
  US: "/banners/ps-us.png",
  UK: "/banners/ps-uk.png",
  TR: "/banners/ps-tr.png",
  IN: "/banners/ps-in.png",
  PL: "/banners/ps-pl.png",
};

type Denom = { denominationId: string; amountMajor: number; priceMinor: number };

export type CardLine = {
  denominationId: string;
  amountMajor: number;
  currency: string;
  region: string;
  regionLabel: string;
  priceMinor: number;
  qty: number;
  image: string;
};

export type RegionPrice = {
  region: string;
  regionLabel: string;
  currency: string;
  localPrice: number;
  localPriceLabel: string;
  /** Cost in ruble minor units via the cheapest covering set of gift cards. */
  rubleMinor: number;
  cards: CardLine[];
  savingsPct: number;
  best: boolean;
};

export type PricedEdition = { name: string; regions: RegionPrice[]; extras?: string[] };
export type PricedGame = {
  slug: string;
  title: string;
  platform: string;
  releaseDate: string;
  cover: string;
  editions: PricedEdition[];
  summary?: string;
};

function formatLocal(amount: number, currency: string): string {
  const dec = CURRENCY_DECIMALS[currency] ?? 0;
  const n = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  return currency === "PLN" ? `${n} ${sym}` : `${sym}${n}`;
}

// Rubles of "hassle" charged per extra card so the plan favours a few large
// cards over many tiny ones. Small denominations are often a hair cheaper per
// dollar at wholesale, so a pure cost-minimiser buys 16×$5 to cover $80; this
// penalty makes it prefer $75+$5. Tuned to still avoid a big overshoot (e.g. one
// $100 card for an $80 game): the ~1800₽ saved by two exact cards beats 1×λ.
const CARD_PENALTY_MINOR = 30000;

/**
 * A practical set of gift cards (with repetition) whose face value covers the
 * game price: minimises ruble cost PLUS a per-card penalty, so it prefers the
 * largest fitting denomination topped up with a smaller one over a pile of tiny
 * cards. DP over the currency's smallest unit — prices stay small because
 * integer currencies (TRY/INR/PLN) are handled in major units and only USD/GBP
 * scale by 100. `rubleMinor` is the real cost (no penalty).
 */
function cheapestCover(
  localPrice: number,
  currency: string,
  denoms: Denom[],
): { rubleMinor: number; cards: Array<{ denom: Denom; qty: number }> } | null {
  const scale = 10 ** (CURRENCY_DECIMALS[currency] ?? 0);
  const target = Math.round(localPrice * scale);
  const items = denoms
    .map((d) => ({ denom: d, units: Math.round(d.amountMajor * scale) }))
    .filter((d) => d.units > 0 && d.denom.priceMinor > 0);
  if (target <= 0 || items.length === 0) return null;

  const maxUnit = Math.max(...items.map((d) => d.units));
  const cap = target + maxUnit;
  // weight = real ruble cost + CARD_PENALTY_MINOR per card. We optimise weight,
  // then report the real cost by re-summing the chosen cards.
  const weight = new Array<number>(cap + 1).fill(Number.POSITIVE_INFINITY);
  const choice = new Array<number>(cap + 1).fill(-1);
  weight[0] = 0;
  for (let s = 1; s <= cap; s++) {
    for (let i = 0; i < items.length; i++) {
      const prev = Math.max(0, s - items[i].units);
      if (!Number.isFinite(weight[prev])) continue;
      const w = weight[prev] + items[i].denom.priceMinor + CARD_PENALTY_MINOR;
      if (w < weight[s]) {
        weight[s] = w;
        choice[s] = i;
      }
    }
  }

  let bestSum = -1;
  let bestWeight = Number.POSITIVE_INFINITY;
  for (let s = target; s <= cap; s++) {
    if (weight[s] < bestWeight) {
      bestWeight = weight[s];
      bestSum = s;
    }
  }
  if (bestSum < 0 || !Number.isFinite(bestWeight)) return null;

  const counts = new Map<number, number>();
  let rubleMinor = 0;
  let s = bestSum;
  let guard = 0;
  while (s > 0 && guard++ < 100000) {
    const i = choice[s];
    if (i < 0) break;
    counts.set(i, (counts.get(i) ?? 0) + 1);
    rubleMinor += items[i].denom.priceMinor;
    s = Math.max(0, s - items[i].units);
  }
  const cards = [...counts.entries()]
    .map(([i, qty]) => ({ denom: items[i].denom, qty }))
    .sort((a, b) => b.denom.amountMajor - a.denom.amountMajor);
  return { rubleMinor, cards };
}

/**
 * Prices a given list of games against the live PlayStation gift-card catalog.
 * Shared by the storefront (`pricedGames`) and the admin preview, so the price
 * an admin verifies is exactly what shoppers see.
 */
export async function priceGames(games: Game[]): Promise<PricedGame[]> {
  let products: Awaited<ReturnType<typeof getPublishedProducts>> = [];
  try {
    products = await getPublishedProducts();
  } catch {
    products = [];
  }

  const byRegion = new Map<string, Denom[]>();
  for (const p of products) {
    if (p.productType !== "playstation" || p.salePriceMinor == null) continue;
    const list = byRegion.get(p.region) ?? [];
    list.push({
      denominationId: p.denominationId,
      amountMajor: p.amountMajor,
      priceMinor: p.salePriceMinor,
    });
    byRegion.set(p.region, list);
  }

  return games.map((game) => ({
    slug: game.slug,
    title: game.title,
    platform: game.platform,
    releaseDate: game.releaseDate,
    cover: game.cover,
    editions: sortEditions(game.editions).map((ed) => {
      const regions: RegionPrice[] = [];
      for (const [region, currency] of Object.entries(GAME_REGION_CURRENCY)) {
        const localPrice = ed.prices[region];
        if (localPrice == null) continue;
        const denoms = byRegion.get(region) ?? [];
        const cover = cheapestCover(localPrice, currency, denoms);
        if (!cover) continue;
        const regionLabel = GAME_REGION_LABEL[region] ?? region;
        regions.push({
          region,
          regionLabel,
          currency,
          localPrice,
          localPriceLabel: formatLocal(localPrice, currency),
          rubleMinor: cover.rubleMinor,
          cards: cover.cards.map((c) => ({
            denominationId: c.denom.denominationId,
            amountMajor: c.denom.amountMajor,
            currency,
            region,
            regionLabel,
            priceMinor: c.denom.priceMinor,
            qty: c.qty,
            image: REGION_BANNER[region] ?? "/banners/playstation.png",
          })),
          savingsPct: 0,
          best: false,
        });
      }
      if (regions.length > 0) {
        const maxCost = Math.max(...regions.map((r) => r.rubleMinor));
        const minCost = Math.min(...regions.map((r) => r.rubleMinor));
        for (const r of regions) {
          r.savingsPct = maxCost > 0 ? Math.round((1 - r.rubleMinor / maxCost) * 100) : 0;
          r.best = r.rubleMinor === minCost;
        }
        regions.sort((a, b) => a.rubleMinor - b.rubleMinor);
      }
      return { name: ed.name, regions, extras: ed.extras };
    }),
    summary: game.summary,
  }));
}

/**
 * The games shown on the storefront: the built-in seed list first (GTA leads),
 * then admin-managed DB games in the order they were added, deduped by slug (DB
 * wins). Falls back to the built-ins alone if the DB is unavailable, so the
 * block never blanks out.
 */
export async function getDisplayGames(): Promise<Game[]> {
  const dbGames = await listDbGames();
  const dbSlugs = new Set(dbGames.map((g) => g.slug));
  return [...GAMES.filter((g) => !dbSlugs.has(g.slug)), ...dbGames];
}

/** Storefront games with per-region ruble cost from the live catalog. */
export async function pricedGames(): Promise<PricedGame[]> {
  return priceGames(await getDisplayGames());
}
