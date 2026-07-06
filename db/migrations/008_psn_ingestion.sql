-- PSN Store ingestion layer.
-- Regional products, price history, job queue, fetch cache.
-- catalog_products.indian_psn_id stays untouched; cross-region products live here.

CREATE TYPE psn_job_status AS ENUM (
  'pending', 'running', 'done', 'failed', 'cancelled'
);

CREATE TABLE psn_import_jobs (
  id             uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  status         psn_job_status  NOT NULL DEFAULT 'pending',
  region         text            NOT NULL,
  category_url   text            NOT NULL,
  page_from      integer         NOT NULL DEFAULT 1,
  page_to        integer         NOT NULL,
  dry_run        boolean         NOT NULL DEFAULT false,
  pages_fetched  integer         NOT NULL DEFAULT 0,
  products_seen  integer         NOT NULL DEFAULT 0,
  products_upserted integer      NOT NULL DEFAULT 0,
  error_message  text,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz     NOT NULL DEFAULT now(),
  updated_at     timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX psn_import_jobs_status_created_idx
  ON psn_import_jobs (status, created_at DESC);

CREATE TABLE psn_import_job_events (
  id         bigserial   PRIMARY KEY,
  job_id     uuid        NOT NULL REFERENCES psn_import_jobs(id) ON DELETE CASCADE,
  event_type text        NOT NULL,
  message    text        NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX psn_import_job_events_job_cursor_idx
  ON psn_import_job_events (job_id, id);

-- One row per (region, psn_product_id) — the canonical regional record.
CREATE TABLE psn_regional_products (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               uuid        REFERENCES catalog_products(id) ON DELETE SET NULL,
  region                   text        NOT NULL,
  psn_product_id           text        NOT NULL,
  np_title_id              text,
  store_url                text        NOT NULL,
  title                    text        NOT NULL,
  image_url                text,
  platforms                text[]      NOT NULL DEFAULT '{}',
  voice_languages          text[]      NOT NULL DEFAULT '{}',
  subtitle_languages       text[]      NOT NULL DEFAULT '{}',
  publisher                text,
  release_date             date,
  description_original_html text,
  description_original_text text,
  description_ru_html      text,
  description_ru_text      text,
  raw_json                 jsonb       NOT NULL DEFAULT '{}',
  parser_version           text        NOT NULL DEFAULT '1',
  first_seen_at            timestamptz NOT NULL DEFAULT now(),
  last_seen_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, psn_product_id)
);

CREATE INDEX psn_regional_products_np_title_id_idx
  ON psn_regional_products (np_title_id)
  WHERE np_title_id IS NOT NULL;

CREATE INDEX psn_regional_products_region_idx
  ON psn_regional_products (region);

-- Price snapshots — append-only history.
CREATE TABLE psn_price_snapshots (
  id                       bigserial   PRIMARY KEY,
  psn_regional_product_id  uuid        NOT NULL
    REFERENCES psn_regional_products(id) ON DELETE CASCADE,
  price_minor              integer,
  original_price_minor     integer,
  currency_code            char(3),
  is_on_sale               boolean GENERATED ALWAYS AS (
    price_minor IS NOT NULL
    AND original_price_minor IS NOT NULL
    AND price_minor < original_price_minor
  ) STORED,
  fetched_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX psn_price_snapshots_product_time_idx
  ON psn_price_snapshots (psn_regional_product_id, fetched_at DESC);

-- Persistent HTML cache: avoids re-fetching unchanged pages within TTL.
CREATE TABLE psn_fetch_cache (
  url            text        PRIMARY KEY,
  body_html      text        NOT NULL,
  body_hash      text        NOT NULL,
  parser_version text        NOT NULL DEFAULT '1',
  fetched_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

CREATE INDEX psn_fetch_cache_expires_idx
  ON psn_fetch_cache (expires_at);
