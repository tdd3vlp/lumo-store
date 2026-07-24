-- Pre-order games shown in the "Игры и предзаказы" block, managed from the
-- admin panel (add by PSN store URL). Each row is one game; its per-region store
-- prices live in `editions` as JSON — an array of
--   { "name": "Standard Edition", "prices": { "US": 69.99, "TR": 3199, ... } }
-- matching the GameEdition shape in lib/games/catalog.ts. Ruble prices are NOT
-- stored: they're computed at request time from the live PlayStation gift-card
-- catalog (see lib/games/pricing.ts), so one price change re-prices every game.
--
-- `cover_url` is a remote PSN image URL (served directly — next/image runs
-- unoptimized, so no host allowlist and no on-disk copy). `source_url` keeps the
-- store link the game was imported from, for re-checking prices later.

CREATE TABLE preorder_games (
  slug text PRIMARY KEY,
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'PS5',
  release_date text NOT NULL DEFAULT '',
  cover_url text NOT NULL,
  source_url text,
  editions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
