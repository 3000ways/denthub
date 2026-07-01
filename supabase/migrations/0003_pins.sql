-- Community Pinboard: a signed-in dentist "pins" one resource to a shared cork-board
-- on the home page. Pins are public (anyone, even signed-out, sees the board) and
-- each user may pin at most once per day. The board shows the most recent pins.
--
-- Attribution ("Pinned by a periodontist in Ohio") is stored as a SNAPSHOT of the
-- pinner's specialty + region at pin-time, NOT a live link to their profile. Reasons:
--   1. the board is public but profiles are private to their owner, so a live join
--      would be blocked by the profiles table's row-level security;
--   2. the attribution survives the pinner later editing or deleting their profile;
--   3. only the two coarse fields are ever public — never the person's name.
-- When a user pins anonymously (or hasn't filled in their profile) the snapshot
-- fields stay NULL and is_anonymous is true.

CREATE TABLE public.pins (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id      TEXT NOT NULL,                 -- Airtable resource record id (e.g. rec...)
  pinner_specialty TEXT,                           -- snapshot of profile.specialty at pin-time (nullable)
  pinner_region    TEXT,                           -- snapshot of profile.province_state at pin-time (nullable)
  is_anonymous     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- UTC calendar day of the pin, used to enforce one-pin-per-user-per-day. Set by
  -- default at insert time (defaults need not be immutable), so the unique index
  -- below can sit on plain columns and stay race-safe.
  pinned_on        DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date)
);

-- Newest-first lookups for the board.
CREATE INDEX pins_created_idx ON public.pins (created_at DESC);

-- Rate limit: one pin per user per UTC day, enforced at the database level (race-safe).
CREATE UNIQUE INDEX pins_one_per_user_per_day ON public.pins (user_id, pinned_on);

-- RLS: the board is world-readable; a user may only insert/delete their own pins.
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pins_public_read" ON public.pins
  FOR SELECT USING (true);

CREATE POLICY "pins_own_insert" ON public.pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pins_own_delete" ON public.pins
  FOR DELETE USING (auth.uid() = user_id);
