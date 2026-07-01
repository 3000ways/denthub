-- Episode bookmarks: a signed-in dentist saves an individual podcast episode to
-- come back to later. Distinct from the `bookmarks` table (which follows a whole
-- show/resource) — this is episode-level, keyed to a row in `episodes`. Saved
-- episodes get their own section on the Saved page.
--
-- Private per-user (own-read/insert/delete RLS), one row per (user, episode).

CREATE TABLE public.episode_bookmarks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID   NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  episode_id  BIGINT NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One bookmark per user per episode (race-safe at the DB level).
CREATE UNIQUE INDEX episode_bookmarks_unique ON public.episode_bookmarks (user_id, episode_id);
-- Newest-first listing of a user's saved episodes.
CREATE INDEX episode_bookmarks_user_idx ON public.episode_bookmarks (user_id, created_at DESC);

-- RLS: a user can only see and change their own episode bookmarks.
ALTER TABLE public.episode_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "episode_bookmarks_own_read" ON public.episode_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "episode_bookmarks_own_insert" ON public.episode_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "episode_bookmarks_own_delete" ON public.episode_bookmarks
  FOR DELETE USING (auth.uid() = user_id);
