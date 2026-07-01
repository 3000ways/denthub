-- Extend the Community Pinboard so a pin can be an individual podcast EPISODE,
-- not just a whole resource. A pin now references exactly one of:
--   - resource_id (Airtable resource record id), or
--   - episode_id  (a row in the episodes archive).
--
-- Everything else is unchanged: still public-read, own-insert/own-delete, and
-- still one pin per user per UTC day (the pinned_on unique index is untouched,
-- so the daily limit is shared across resource and episode pins).

ALTER TABLE public.pins ALTER COLUMN resource_id DROP NOT NULL;

ALTER TABLE public.pins
  ADD COLUMN episode_id BIGINT REFERENCES public.episodes(id) ON DELETE CASCADE;

-- Exactly one target: a pin is either a resource OR an episode, never both/neither.
ALTER TABLE public.pins
  ADD CONSTRAINT pins_exactly_one_target
  CHECK ((resource_id IS NOT NULL) <> (episode_id IS NOT NULL));
