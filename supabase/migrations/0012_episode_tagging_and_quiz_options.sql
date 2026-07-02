-- Episode AI tagging + admin-editable quiz taxonomy.
--
-- Replaces resource-tag keyword matching with per-EPISODE AI tags: an AI reads
-- each episode's title/description and marks which quiz answers it fits (career
-- stage, clinical interest, or "what you're working on"). "Recommended for You"
-- then becomes a simple array-overlap query against a person's quiz answers.
--
-- The quiz's own answer options move out of hardcoded JS into `quiz_options`, so
-- the same table drives (a) what the quiz asks, (b) what the AI tags episodes
-- with, and (c) an admin screen to add/retire options without a code deploy.

-- ─── Episode tagging columns ──────────────────────────────────────────────
alter table public.episodes
  add column if not exists quiz_tags            text[],
  add column if not exists quiz_tagged_at        timestamptz,
  add column if not exists quiz_tag_claimed_at   timestamptz;

create index if not exists episodes_quiz_tags_gin on public.episodes using gin (quiz_tags);
-- Speeds up "find the next untagged batch" as the archive grows past 38k rows.
create index if not exists episodes_untagged_idx on public.episodes (id) where quiz_tagged_at is null;

-- ─── Admin-editable quiz taxonomy ─────────────────────────────────────────
create table if not exists public.quiz_options (
  id            bigint generated always as identity primary key,
  question_key  text not null check (question_key in ('career_stage','interest','working_on')),
  label         text not null,
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists quiz_options_key_label_unique on public.quiz_options (question_key, label);
create index if not exists quiz_options_active_idx on public.quiz_options (question_key, active, sort_order);

alter table public.quiz_options enable row level security;
-- Public read (the quiz UI and profile settings fetch this with the anon key);
-- writes go only through the service-role key via the admin API.
create policy "quiz_options_public_read" on public.quiz_options for select using (true);

insert into public.quiz_options (question_key, label, sort_order) values
  ('career_stage', 'Student',         0),
  ('career_stage', 'New grad',        1),
  ('career_stage', 'Associate',       2),
  ('career_stage', 'Practice owner',  3),
  ('career_stage', 'Specialist',      4),
  ('career_stage', 'Team member',     5),
  ('career_stage', 'Retiring',        6),
  ('career_stage', 'Retired',         7),
  ('interest', 'Endodontics',          0),
  ('interest', 'Periodontics',         1),
  ('interest', 'Orthodontics',         2),
  ('interest', 'Oral surgery',         3),
  ('interest', 'Prosthodontics',       4),
  ('interest', 'Pediatric',            5),
  ('interest', 'Oral radiology',       6),
  ('interest', 'General practice',     7),
  ('interest', 'Orofacial pain',       8),
  ('interest', 'Pathology',            9),
  ('interest', 'TMD',                  10),
  ('interest', 'Myofunctional Therapy',11),
  ('working_on', 'Growing production',        0),
  ('working_on', 'Hiring or building a team', 1),
  ('working_on', 'Technology',                2),
  ('working_on', 'Marketing',                 3),
  ('working_on', 'Finance or tax',            4),
  ('working_on', 'Investment',                5),
  ('working_on', 'Leadership',                6),
  ('working_on', 'Work-life balance',         7),
  ('working_on', 'Practice transition or sale', 8)
on conflict (question_key, label) do nothing;

-- ─── Tagging run log (mirrors scoring_runs) ───────────────────────────────
create table if not exists public.tagging_runs (
  id              bigint generated always as identity primary key,
  ran_at          timestamptz not null default now(),
  trigger         text not null check (trigger in ('backfill','harvest')),
  tagged_count    int not null default 0,
  remaining_count int,
  sample          jsonb
);

-- ─── Profiles: clinical interest picks (career_stage + focus_areas already
--     exist from migration 0011; focus_areas now stores the "working_on" picks) ──
alter table public.profiles
  add column if not exists interests text[];

-- ─── Atomic batch claim for the backfill ──────────────────────────────────
-- SELECT ... FOR UPDATE SKIP LOCKED so two overlapping backfill calls can never
-- grab the same rows. A row is only marked quiz_tagged_at (final) after the AI
-- call actually succeeds; quiz_tag_claimed_at is just an in-flight marker that
-- expires after 5 minutes, so a batch that errors out doesn't strand its rows.
create or replace function public.claim_untagged_episodes(p_batch_size int)
returns setof public.episodes
language plpgsql
as $$
begin
  return query
    update public.episodes
    set quiz_tag_claimed_at = now()
    where id in (
      select id from public.episodes
      where quiz_tagged_at is null
        and (quiz_tag_claimed_at is null or quiz_tag_claimed_at < now() - interval '5 minutes')
      order by id
      limit p_batch_size
      for update skip locked
    )
    returning *;
end;
$$;
