-- Migration 0003: results_aggregate table + RPC

CREATE TABLE IF NOT EXISTS results_aggregate (
  vote_option_id UUID PRIMARY KEY REFERENCES vote_options(id),
  total_votes    BIGINT NOT NULL DEFAULT 0,
  percentage     NUMERIC(7, 4) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RPC to atomically increment and recalculate percentage
CREATE OR REPLACE FUNCTION increment_vote(p_vote_option_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_total BIGINT;
  v_grand_total BIGINT;
BEGIN
  -- Upsert this option's count
  INSERT INTO results_aggregate (vote_option_id, total_votes, updated_at)
  VALUES (p_vote_option_id, 1, NOW())
  ON CONFLICT (vote_option_id)
  DO UPDATE SET
    total_votes = results_aggregate.total_votes + 1,
    updated_at  = NOW();

  -- Get grand total
  SELECT SUM(total_votes) INTO v_grand_total FROM results_aggregate;

  -- Recalculate all percentages
  IF v_grand_total > 0 THEN
    UPDATE results_aggregate
    SET percentage = ROUND((total_votes::NUMERIC / v_grand_total) * 100, 4);
  END IF;
END;
$$;
