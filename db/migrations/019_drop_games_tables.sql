-- Drops the games/PSN-catalog tables now that the storefront has pivoted away
-- from selling games to selling gift-card / top-up codes. These tables are used
-- ONLY by lumo-store (the sibling `market` service never touches them), so
-- dropping them does not affect Yandex Market fulfillment.
--
-- WARNING: destructive. Running this deletes all imported catalog / PSN product
-- history. Take a database snapshot before applying against production.
--
-- CASCADE is safe here because every foreign-key dependency among these tables
-- is internal to this games-only set: catalog_offers -> catalog_products,
-- psn_regional_products -> catalog_products, psn_collection_items /
-- psn_price_snapshots -> psn_regional_products. Nothing in the surviving
-- commerce schema (orders, order_items, gift_card_*, loyalty_*) references them.

DROP TABLE IF EXISTS psn_collection_items CASCADE;
DROP TABLE IF EXISTS psn_collections CASCADE;
DROP TABLE IF EXISTS psn_price_snapshots CASCADE;
DROP TABLE IF EXISTS psn_fetch_cache CASCADE;
DROP TABLE IF EXISTS psn_import_job_events CASCADE;
DROP TABLE IF EXISTS psn_import_jobs CASCADE;
DROP TABLE IF EXISTS psn_regional_products CASCADE;

DROP TABLE IF EXISTS catalog_offers CASCADE;
DROP TABLE IF EXISTS catalog_products CASCADE;
DROP TABLE IF EXISTS catalog_imports CASCADE;

DROP TYPE IF EXISTS psn_job_status;
