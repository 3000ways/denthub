-- The introduction (kind = trailer) is drafted in the same week as the first
-- weekly, so "one briefing per show per week" must be per kind.
ALTER TABLE public.briefings DROP CONSTRAINT IF EXISTS briefings_cluster_week_key;
ALTER TABLE public.briefings ADD CONSTRAINT briefings_cluster_week_kind_key UNIQUE (cluster, week_of, kind);
