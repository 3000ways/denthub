-- Journal Briefings — "listen before you launch": the admin can render a show's
-- introduction to audio without publishing anything. Remembers the last preview
-- and the hash of the intro text it was rendered from, so the admin can warn
-- when the text changed after the preview.
ALTER TABLE public.briefing_shows
  ADD COLUMN IF NOT EXISTS intro_preview_url  TEXT,
  ADD COLUMN IF NOT EXISTS intro_preview_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_preview_hash TEXT,
  ADD COLUMN IF NOT EXISTS intro_preview_meta JSONB;   -- { seconds, cents, cached_pieces, pieces }
