-- Migration 0001: candidates table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS candidates (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_source      TEXT NOT NULL DEFAULT 'jne',
  external_id          TEXT NULL,
  full_name            TEXT NOT NULL,
  party_name           TEXT NOT NULL,
  party_logo_url       TEXT NULL,
  candidate_photo_url  TEXT NULL,
  source_url           TEXT NOT NULL,
  source_hash          TEXT NULL,
  sort_order           INT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at       TIMESTAMPTZ NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_active
  ON candidates (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_external_source_external_id
  ON candidates (external_source, external_id)
  WHERE external_id IS NOT NULL;
