-- 0020: Resources + Categories move from Airtable to Supabase (migration Phase 1).
--
-- Why: Airtable's free-tier API cap (1,000 calls/month) was exceeded by the daily
-- crons (harvester art writes + full-table pagination) and Airtable now 429-blocks
-- all requests, taking the site's resource lists down. Content moves here, where
-- there is no API cap. See ROADMAP.md "Migrate off Airtable → Supabase".
--
-- Keyed by the original Airtable record IDs (text 'rec...'), so every existing
-- reference in bookmarks / pins / votes / claims / reports keeps working untouched.
--
-- final_score replicates the Airtable formula EXACTLY, including its quirks:
--   • weights 25/25/20/15/15, blanks counted as 0, rounded half-up
--   • NULL when expert_score OR recency_score is NULL *or 0* (Airtable's IF()
--     treats 0 as falsy) — never-judged and long-silent resources get no score
--     and sort last.
--   • arithmetic in DOUBLE PRECISION, not numeric: Airtable computes in IEEE
--     floats, so e.g. 78/50/57/72/62 sums to 63.4999…→63, where exact decimal
--     math would give 63.5→64. Float math here reproduces Airtable bit-for-bit.
-- Verified against the full CSV export: 789/789 rows reproduce exactly
-- (final_score = airtable_final_score, the exported value kept as audit trail).

create table public.resources (
  id text primary key check (id ~ '^rec[A-Za-z0-9]{14}$'),
  name text not null default '',
  url text,
  thumbnail text,
  type text,
  specialty text[] not null default '{}',
  audience text,                       -- legacy field, superseded by career_stage
  description text,
  host_or_author text,
  expert_score numeric,
  popularity_score numeric,
  recency_score numeric,
  clinical_depth_score numeric,
  community_score numeric,
  vote_count integer,
  status text,
  added_by text,
  date_added date,
  editor_notes text,
  image_url text,                      -- human-set; automation must never overwrite
  auto_image_url text,                 -- machine "auto box" (harvester / research agent)
  rss_feed_url text,
  tags text,                           -- retired junk field, imported for fidelity only
  community_pick boolean not null default false,
  source text,
  submission_status text,
  submitter_email text,
  topic text[] not null default '{}',
  goals_outcomes text[] not null default '{}',
  career_stage text[] not null default '{}',
  needs_tag_review boolean not null default false,
  editors_pick boolean not null default false,
  editors_pick_blurb text,
  editors_pick_order integer,
  featured_section text,
  score_rationale text,
  last_judged timestamptz,
  voice_type text,                     -- Human / AI-generated / Mixed
  voice_status text,                   -- Suspected / Confirmed
  voice_note text,
  airtable_final_score numeric,        -- Final Score as exported 2026-08-03 (audit)
  final_score numeric generated always as (
    case
      when expert_score is null or expert_score = 0
        or recency_score is null or recency_score = 0 then null
      else floor(
        0.25 * coalesce(expert_score, 0)::double precision
      + 0.25 * coalesce(community_score, 0)::double precision
      + 0.20 * coalesce(popularity_score, 0)::double precision
      + 0.15 * coalesce(recency_score, 0)::double precision
      + 0.15 * coalesce(clinical_depth_score, 0)::double precision
      + 0.5)::numeric                  -- floor(x+0.5) = round half-up, like Airtable
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_status_idx on public.resources (status);
create index resources_type_idx on public.resources (type);
create index resources_final_score_idx on public.resources (final_score desc nulls last);

create table public.categories (
  name text primary key,               -- Airtable 'Category Name' (no rec IDs referenced anywhere)
  theme text,
  specialty text,
  display_order integer,
  visible boolean not null default true
);

-- Public read (same model as episodes); writes only via the service-role key.
alter table public.resources enable row level security;
alter table public.categories enable row level security;
create policy resources_public_read on public.resources for select using (true);
create policy categories_public_read on public.categories for select using (true);
