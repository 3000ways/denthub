-- Journal Briefings — week 3: our own podcast feeds and directory listings.
-- audio_bytes feeds the RSS <enclosure length>; apple_url / spotify_url are
-- pasted in by Andrei once each directory approves the show, and then appear
-- on the hub, show and episode pages. feed_guid is the stable
-- <podcast:guid> identity of each feed (never changes once minted).
ALTER TABLE public.briefings      ADD COLUMN IF NOT EXISTS audio_bytes BIGINT;
ALTER TABLE public.briefing_shows ADD COLUMN IF NOT EXISTS apple_url   TEXT,
                                  ADD COLUMN IF NOT EXISTS spotify_url TEXT,
                                  ADD COLUMN IF NOT EXISTS feed_guid   UUID NOT NULL DEFAULT gen_random_uuid();
