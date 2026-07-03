-- 0013: Ensure the profile columns the onboarding quiz / profile page write to
-- actually exist on the live database.
--
-- Symptom that prompted this: on the profile page, the "Your interest" pills
-- saved and persisted, but "What describes you?" (career_stage) and "What you're
-- working on" (focus_areas) did NOT — because migration 0011 (which added
-- career_stage, focus_areas, onboarding_completed_at) evidently never got applied
-- to this database, while 0012 (which added `interests`) did. updateProfile only
-- writes columns that exist, so the missing ones were silently skipped.
--
-- Idempotent: `add column if not exists` is a safe no-op for any column that
-- already exists, so this is safe to run regardless of the current schema.
alter table public.profiles
  add column if not exists career_stage            text,
  add column if not exists focus_areas             text[],
  add column if not exists interests               text[],
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists role                    text,
  add column if not exists province_state          text;
