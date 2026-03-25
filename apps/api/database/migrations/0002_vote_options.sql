-- Migration 0002: vote_options and survey_responses

CREATE TABLE IF NOT EXISTS vote_options (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         TEXT NOT NULL CHECK (type IN ('candidate', 'blank', 'undecided')),
  candidate_id UUID NULL REFERENCES candidates(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed special options
INSERT INTO vote_options (type, label, slug, is_active)
VALUES
  ('blank',     'Voto en blanco', 'voto-en-blanco', TRUE),
  ('undecided', 'Aún no lo sé',   'aun-no-lo-se',   TRUE)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS survey_responses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vote_option_id   UUID NOT NULL REFERENCES vote_options(id),
  latitude         NUMERIC(10, 7) NOT NULL,
  longitude        NUMERIC(10, 7) NOT NULL,
  accuracy         NUMERIC(10, 2) NULL,
  permission_state TEXT NOT NULL,
  source           TEXT NOT NULL DEFAULT 'web',
  session_id       TEXT NULL,
  ip_hash          TEXT NULL,
  user_agent       TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_vote_option_id
  ON survey_responses (vote_option_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at
  ON survey_responses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_responses_created_vote_option
  ON survey_responses (vote_option_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_responses_ip_hash
  ON survey_responses (ip_hash, created_at DESC);
