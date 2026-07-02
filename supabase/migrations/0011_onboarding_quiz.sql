-- Onboarding quiz: three new bits of profile data captured right after a user's
-- first Google sign-in, used to personalize the homepage ("Recommended for you").
--
--   career_stage            — Q1, single choice (Student … Retired).
--   focus_areas             — Q3, up to 3 choices. Stored as the human labels the
--                             user clicked (e.g. "Growing production"); the app maps
--                             those to resource Topic tags in lib/onboarding.js.
--   onboarding_completed_at — set once the quiz is finished OR skipped, so the
--                             welcome modal only ever shows a person once.
--
-- Specialty (Q2) already lives on profiles.specialty — the quiz writes to it, it is
-- not re-added here. All columns are nullable/additive, so this is a safe migration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_stage            TEXT,
  ADD COLUMN IF NOT EXISTS focus_areas             TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
