-- 0017_profiles_owner_read.sql
--
-- SECURITY FIX (audit security #2): the `profiles` table was world-readable via a
-- `SELECT USING (true)` policy, exposing every user's email, full name, and NPI number
-- to any anonymous visitor using the public anon key.
--
-- The app only ever reads a user's OWN profile from the browser
-- (lib/auth-context.js: `.eq('id', userId)` where userId = auth.uid()), and pin
-- attribution is a stored snapshot on the pin row (not a live profile join), so
-- restricting SELECT to the owner does not break any public feature. Admin reads go
-- through the service-role key, which bypasses RLS.

alter table public.profiles enable row level security;

-- Remove the world-readable policy (name from the live database).
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
-- Defensive: drop any other permissive public-read variants if present.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "profiles_select_public" on public.profiles;

-- Owner-only read.
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles
  for select
  using (auth.uid() = id);
