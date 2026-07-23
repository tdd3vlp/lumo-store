-- Split the single NS.gifts markup into two policies.
--
-- Previously ns_markup_bps applied to everything. Gift cards
-- (PlayStation/Xbox/Apple/… denomination catalog) and wallet top-ups (Steam,
-- Telegram Stars) now carry different commissions:
--   - ns_markup_bps        → gift cards      (22%)
--   - ns_topup_markup_bps  → Steam/Telegram  (19%)
--
-- ns_markup_bps is force-set to the new card rate; the top-up key is created.
INSERT INTO app_settings (key, value) VALUES
  ('ns_markup_bps', '2200'),
  ('ns_topup_markup_bps', '1900')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
