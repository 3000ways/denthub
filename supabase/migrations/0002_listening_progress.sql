-- Listening progress: tracks per-user, per-episode playback position and completion.
-- One row per (user, episode) pair — upserted on every sync from the player.

CREATE TABLE public.listening_progress (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id        BIGINT  NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  show_resource_id  TEXT,                        -- denormalized Airtable resource ID for easy filtering
  position_seconds  INTEGER NOT NULL DEFAULT 0,  -- where the user stopped
  duration_seconds  INTEGER,                     -- total episode length (from RSS)
  completed         BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at      TIMESTAMPTZ,
  listened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- last activity timestamp

  CONSTRAINT listening_progress_user_episode_key UNIQUE (user_id, episode_id)
);

CREATE INDEX listening_progress_user_idx    ON public.listening_progress (user_id);
CREATE INDEX listening_progress_episode_idx ON public.listening_progress (episode_id);
CREATE INDEX listening_progress_listened_idx ON public.listening_progress (user_id, listened_at DESC);

-- RLS: each user can only read and write their own rows
ALTER TABLE public.listening_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_progress_select" ON public.listening_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_progress_insert" ON public.listening_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_progress_update" ON public.listening_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_own_progress_delete" ON public.listening_progress
  FOR DELETE USING (auth.uid() = user_id);
