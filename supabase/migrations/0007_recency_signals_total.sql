-- Add total episode count to the recency-signals view. Used as a (low-
-- confidence) popularity proxy for podcasts: a large, actively-maintained back
-- catalog signals an established show. There's no public listener-count API, so
-- this reach proxy is Bayesian-shrunk hard in the scorer.

CREATE OR REPLACE VIEW public.resource_recency_signals AS
SELECT
  show_resource_id AS resource_id,
  (CURRENT_DATE - MAX(published_at)::date)                                     AS days_since_last,
  COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '90 days')::int      AS items_90d,
  COUNT(*)::int                                                                AS total_episodes
FROM public.episodes
WHERE show_resource_id IS NOT NULL AND published_at IS NOT NULL
GROUP BY show_resource_id;
