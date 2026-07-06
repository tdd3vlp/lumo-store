-- Dry-run results are staged here so a second browser pass is not needed
-- when the user commits the import. Each element matches ParsedCategoryProduct
-- plus a salesRank field added by the importer.
ALTER TABLE psn_import_jobs
  ADD COLUMN IF NOT EXISTS staged_products jsonb;
