// Pre-order games shown in the "Игры" block. Each edition lists the game's
// store price per PSN region (in that region's currency). The server then works
// out which of our PlayStation gift cards cover that price and how much it costs
// in rubles — see lib/games/pricing.ts. Isomorphic (no server bits).

export type GameEdition = {
  name: string;
  /** region code → store price in that region's currency (major units). */
  prices: Record<string, number>;
  /** AI-generated "what's extra vs Standard" bullets (non-Standard editions). */
  extras?: string[];
};

export type Game = {
  slug: string;
  title: string;
  platform: string;
  /** ISO date, e.g. "2026-11-19". */
  releaseDate: string;
  /** Hero cover image (landscape). */
  cover: string;
  editions: GameEdition[];
  /** AI-generated short Russian summary of the game. */
  summary?: string;
};

// Display order for editions: Standard always first, then the ones with
// add-ons. Lower rank = shown first; unknown editions sit just after Standard.
export function editionRank(name: string): number {
  const n = name.toLowerCase();
  if (/\bstandard\b/.test(n)) return 0;
  if (/cross-?gen/.test(n)) return 1;
  if (/\bdigital deluxe\b/.test(n)) return 4;
  if (/\bdeluxe\b/.test(n)) return 3;
  if (/\bgold\b/.test(n)) return 5;
  if (/\bpremium\b/.test(n)) return 6;
  if (/\bultimate\b/.test(n)) return 7;
  if (/\bvault\b/.test(n)) return 8;
  if (/\bdigital\b/.test(n)) return 1;
  return 2;
}

/** Editions ordered for display (Standard first). Stable — keeps input order on ties. */
export function sortEditions<T extends { name: string }>(editions: T[]): T[] {
  return [...editions]
    .map((e, i) => ({ e, i }))
    .sort((a, b) => editionRank(a.e.name) - editionRank(b.e.name) || a.i - b.i)
    .map((x) => x.e);
}

// Curated line-up for the home-page carousel (the catalog page still shows every
// game). Order here is the order they rotate in; slugs not present in the
// catalog are simply skipped.
export const HOME_CAROUSEL_SLUGS = [
  "grand-theft-auto-vi",
  "marvel-s-wolverine",
  "halo-campaign-evolved",
  "minecraft-dungeons-ii",
];

export const GAME_REGION_CURRENCY: Record<string, string> = {
  TR: "TRY",
  IN: "INR",
  US: "USD",
  PL: "PLN",
};

export const GAME_REGION_LABEL: Record<string, string> = {
  TR: "Турция",
  IN: "Индия",
  US: "США",
  PL: "Польша",
};

// All pre-order games now live in the DB (added via the admin panel, with AI
// descriptions and periodic price refresh). This built-in list is kept only as
// a last-resort fallback when the DB is unavailable — normally empty.
export const GAMES: Game[] = [];
