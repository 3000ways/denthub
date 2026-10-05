-- 0024: Treat rss.buzzsprout.com and feeds.buzzsprout.com as the same feed.
--
-- Buzzsprout serves every show's feed on both hosts. The 0022 index compared
-- the raw host, so the same show could be listed twice (one link per host) —
-- three such pairs were found and archived in the 2026-10 feed cleanup.
-- Same key as 0022, plus the host alias. Keep in sync with
-- normalizeFeedUrl() in lib/dedupe-keys.js and feedKey() in lib/harvester.js.
-- The index keeps its name, so writers' DUPLICATE_FEED mapping is unchanged.

drop index if exists public.resources_live_feed_key;

create unique index resources_live_feed_key on public.resources (
  regexp_replace(
    lower(regexp_replace(regexp_replace(btrim(rss_feed_url), '^https?://(www\.)?', '', 'i'), '/+$', '')),
    '^rss\.buzzsprout\.com/', 'feeds.buzzsprout.com/'
  )
)
where rss_feed_url is not null
  and btrim(rss_feed_url) <> ''
  and coalesce(status, '') <> 'Archived'
  and coalesce(submission_status, '') <> 'Rejected';
