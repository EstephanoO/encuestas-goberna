-- Migration 0004: sync_runs table

CREATE TABLE IF NOT EXISTS sync_runs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name    TEXT NOT NULL,
  status         TEXT NOT NULL,
  started_at     TIMESTAMPTZ NOT NULL,
  finished_at    TIMESTAMPTZ NULL,
  metadata_json  JSONB NULL,
  error_message  TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source_name
  ON sync_runs (source_name, started_at DESC);
