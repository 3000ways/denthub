-- Report / flag: a visitor (signed-in OR anonymous) reports a resource or a
-- single episode as broken, inappropriate, irrelevant, offensive, or other.
--
-- Trust model mirrors the episodes archive: writes go ONLY through the
-- service-role key from a server API route (pages/api/report.js) which verifies
-- a Cloudflare Turnstile token first. The table is therefore NOT client-writable
-- and NOT client-readable — RLS is enabled with no anon/authenticated policies,
-- so the anon and authenticated roles can neither read nor insert. Only the
-- service role (which bypasses RLS) touches it. The admin "Reports" tab reads it
-- through the same service-role client.
--
-- Anti-spam: one report per reporter per target per UTC day, enforced by a
-- unique index. Anonymous reporters are identified by a salted hash of their IP
-- (computed server-side, never the raw IP). A report targets EXACTLY ONE of a
-- resource or an episode (CHECK below); target_key collapses that into a single
-- value so the throttle index works whether the target is a resource or episode.

CREATE TABLE public.resource_reports (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resource_id      TEXT,                            -- Airtable resource record id (nullable)
  episode_id       BIGINT REFERENCES public.episodes(id) ON DELETE CASCADE,  -- nullable
  reason           TEXT NOT NULL CHECK (reason IN ('broken','inappropriate','irrelevant','offensive','other')),
  note             TEXT,                            -- optional free-text, capped in the API
  reporter_ip_hash TEXT NOT NULL,                   -- salted hash of the reporter's IP (never the raw IP)
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- set if the reporter was signed in
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  -- Single-value target used by the throttle index. 'r:<resource_id>' for a
  -- resource report, 'e:<episode_id>' for an episode report.
  target_key       TEXT GENERATED ALWAYS AS (
    CASE WHEN resource_id IS NOT NULL THEN 'r:' || resource_id
         ELSE 'e:' || episode_id::text END
  ) STORED,
  -- UTC calendar day, set at insert (defaults need not be immutable) so the
  -- unique index can sit on plain columns and stay race-safe.
  reported_on      DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date),
  -- Exactly one target: a resource OR an episode, never both, never neither.
  CONSTRAINT resource_reports_one_target CHECK (
    (resource_id IS NOT NULL AND episode_id IS NULL) OR
    (resource_id IS NULL AND episode_id IS NOT NULL)
  )
);

-- Triage: newest open reports first, grouped work in the admin tab.
CREATE INDEX resource_reports_status_idx ON public.resource_reports (status, created_at DESC);
CREATE INDEX resource_reports_resource_idx ON public.resource_reports (resource_id);
CREATE INDEX resource_reports_episode_idx ON public.resource_reports (episode_id);

-- Rate limit: one report per reporter (by IP hash) per target per UTC day.
CREATE UNIQUE INDEX resource_reports_one_per_day
  ON public.resource_reports (reporter_ip_hash, target_key, reported_on);

-- RLS on, with NO policies: anon/authenticated get nothing. Service role only.
ALTER TABLE public.resource_reports ENABLE ROW LEVEL SECURITY;
