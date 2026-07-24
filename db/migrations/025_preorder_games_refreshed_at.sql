-- Tracks when each game's prices/data were last re-fetched from PSN, so refresh
-- jobs can process the STALEST games first, a few at a time. This keeps the PSN
-- request rate low as the catalog grows — bursts risk an Akamai block. Seeded
-- from created_at so existing rows enter the rotation in add order.

ALTER TABLE preorder_games ADD COLUMN refreshed_at timestamptz NOT NULL DEFAULT now();
UPDATE preorder_games SET refreshed_at = created_at;
