-- Journal Briefings: a show publishes nothing until its introduction episode
-- has been written (with Andrei) and the show is launched from the admin.
--
--   launched      — the gate. Drafting and rendering skip a show until true.
--   intro_script  — the introduction episode's host lines, one paragraph per
--                   spoken segment, edited in the admin Briefings tab. When
--                   empty the template in lib/briefing-script.js is used.
ALTER TABLE public.briefing_shows
  ADD COLUMN IF NOT EXISTS launched          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS launched_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intro_script      TEXT,
  ADD COLUMN IF NOT EXISTS intro_updated_at  TIMESTAMPTZ;
