-- Recency signals for the automated scoring engine. Aggregates the episode
-- archive per show so the scorer can read one row per podcast instead of
-- scanning tens of thousands of episodes each run. Derived entirely from
-- already-public episode data, so it's safe to expose.
--   days_since_last — days since the show's most recent episode
--   items_90d       — episodes published in the last 90 days (cadence)

CREATE OR REPLACE VIEW public.resource_recency_signals AS
SELECT
  show_resource_id AS resource_id,
  (CURRENT_DATE - MAX(published_at)::date)                                     AS days_since_last,
  COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '90 days')::int      AS items_90d
FROM public.episodes
WHERE show_resource_id IS NOT NULL AND published_at IS NOT NULL
GROUP BY show_resource_id;
