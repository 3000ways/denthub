-- Episode Archive (Phase A): searchable database of every podcast episode.
--
-- Deliberate exception to the "content lives in Airtable" rule: this is a
-- thousands+-row, full-text-searchable cache of public RSS data, so it lives in
-- Supabase/Postgres. Resources stay in Airtable; only episodes are the exception.
--
-- Applied to the dental-commute project via the Supabase MCP on 2026-06-18.
-- Kept here for version control / review (idempotent, safe to re-run).

create table if not exists public.episodes (
  id                bigint generated always as identity primary key,
  show_resource_id  text not null,                 -- Airtable record id of the show
  show_name         text,
  guid              text not null,                 -- stable per-episode id from the feed
  title             text,
  description       text,                           -- capped to ~4 KB by the harvester
  published_at      timestamptz,
  link              text,                           -- episode web page
  audio_url         text,                           -- enclosure (direct audio)
  image             text,
  duration_seconds  integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint episodes_show_guid_key unique (show_resource_id, guid)
);

create index if not exists episodes_fts_idx          on public.episodes using gin (fts);
create index if not exists episodes_published_at_idx on public.episodes (published_at desc nulls last);
create index if not exists episodes_show_idx         on public.episodes (show_resource_id);

-- Public read (episode data is public podcast content). Writes only via the
-- service-role key (which bypasses RLS) used by the harvester.
alter table public.episodes enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'episodes' and policyname = 'episodes_public_read'
  ) then
    create policy "episodes_public_read" on public.episodes for select using (true);
  end if;
end $$;

-- Per-show harvest bookkeeping: drives oldest-first batching and the coverage
-- report. Locked down entirely (no policies) -> only the service role can touch it.
create table if not exists public.harvest_state (
  show_resource_id  text primary key,
  show_name         text,
  feed_url          text,
  last_harvested_at timestamptz,
  last_status       text,                           -- 'ok' | 'error'
  last_error        text,
  episode_count     integer not null default 0,
  updated_at        timestamptz not null default now()
);

alter table public.harvest_state enable row level security;
