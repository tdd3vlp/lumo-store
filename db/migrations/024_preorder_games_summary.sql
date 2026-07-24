-- AI-generated Russian summary for a pre-order game, produced once when the game
-- is added/refreshed (from the ru-ua store description) and stored so pages stay
-- instant. Per-edition "what's extra" bullets live inside the editions JSON
-- (each edition may carry an optional "extras": string[]), so no schema change
-- is needed for those.

ALTER TABLE preorder_games ADD COLUMN summary text NOT NULL DEFAULT '';
