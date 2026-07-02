-- Run log for the automated scoring engine. One row per completed run so the
-- admin Scoring tab can show "last successful run" for each pass. Written and
-- read only by the service-role key (never exposed to the browser); no public
-- policies, so RLS denies anon/authenticated by default.
--   kind    — 'data' (recency/popularity/community) or 'judge' (expert/clinical)
--   summary — counts etc. for that run

CREATE TABLE public.scoring_runs (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind     TEXT NOT NULL,
  ran_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  summary  JSONB
);

CREATE INDEX scoring_runs_kind_time ON public.scoring_runs (kind, ran_at DESC);

ALTER TABLE public.scoring_runs ENABLE ROW LEVEL SECURITY;
