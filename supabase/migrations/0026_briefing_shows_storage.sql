-- Journal Briefings, week 2: one row per show (cluster) and the audio bucket.
--
-- briefing_shows ties a cluster to its `resources` row (the show the player,
-- search and the home row see), carries the per-show kill switch (`paused`),
-- and remembers the trailer. Public read (the feed and hub read it); writes
-- service-role only.
--
-- The `briefings` storage bucket is PUBLIC: episode MP3s and cached speech
-- segments are public podcast audio by design. Writes go through the service
-- role from the render job.

CREATE TABLE IF NOT EXISTS public.briefing_shows (
  cluster             TEXT PRIMARY KEY,
  resource_id         TEXT,                          -- resources.id of the show (created on first publish)
  paused              BOOLEAN NOT NULL DEFAULT FALSE, -- kill switch: no new episodes while true
  trailer_briefing_id BIGINT,
  last_published_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.briefing_shows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'briefing_shows' AND policyname = 'briefing_shows_public_read') THEN
    CREATE POLICY briefing_shows_public_read ON public.briefing_shows FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('briefings', 'briefings', true, 104857600, ARRAY['audio/mpeg', 'application/json'])
ON CONFLICT (id) DO NOTHING;
