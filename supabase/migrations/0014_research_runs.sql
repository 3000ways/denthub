-- Run log for the AI Research agent (admin "Run Research" tab). One row per
-- subcategory searched, so the tab can show "last run / how much it found" and
-- a per-niche "last researched" date that guides what to research next.
--
-- The agent itself writes resources to Airtable (not Supabase); this table is
-- only its activity log, kept in Supabase to match scoring_runs / tagging_runs.
-- Written and read only by the service-role key (never exposed to the browser);
-- no public policies, so RLS denies anon/authenticated by default.
--   batch_id       — groups every subcategory from one "Run research" click
--   research_group — the type the admin picked ('Podcasts', 'YouTube', …)
--   subcategory    — the specific niche searched ('Endodontic Podcasts', …)
--   added/…        — outcome counts for that subcategory pass

create table if not exists public.research_runs (
  id             bigint generated always as identity primary key,
  ran_at         timestamptz not null default now(),
  batch_id       text,
  research_group text,
  subcategory    text,
  added          int not null default 0,
  duplicates     int not null default 0,
  dead_links     int not null default 0,
  directories    int not null default 0,
  sample         jsonb
);

create index if not exists research_runs_time    on public.research_runs (ran_at desc);
create index if not exists research_runs_subcat  on public.research_runs (subcategory, ran_at desc);
create index if not exists research_runs_batch   on public.research_runs (batch_id);

alter table public.research_runs enable row level security;
