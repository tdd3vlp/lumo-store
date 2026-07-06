-- Persist the sale end date on import jobs for audit/history.

ALTER TABLE psn_import_jobs
  ADD COLUMN IF NOT EXISTS sale_end_date date;
