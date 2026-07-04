-- 0014: Home Layout — admin-composed home page.
--
-- One row per audience. `published` is what the live home renders; `draft` is
-- the admin's in-progress edits (Publish copies draft -> published). Each is a
-- JSON object like { "blocks": [ { "key": "...", "on": true, "settings": {...} }, ... ] }.
--
-- Public-read (the home renders `published`); writes go through the admin API
-- using the service-role key, never the browser. Safe/idempotent to re-run.
create table if not exists public.home_layout (
  audience   text primary key check (audience in ('logged_out', 'logged_in')),
  published  jsonb,
  draft      jsonb,
  updated_at timestamptz not null default now()
);

alter table public.home_layout enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'home_layout' and policyname = 'home_layout_public_read'
  ) then
    create policy "home_layout_public_read" on public.home_layout for select using (true);
  end if;
end $$;
