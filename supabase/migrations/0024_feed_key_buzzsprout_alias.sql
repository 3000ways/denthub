-- 0024: Treat rss.buzzsprout.com and feeds.buzzsprout.com as the same feed.
--
-- Buzzsprout serves every show's feed on both hosts. The 0022 index compared
-- the raw host, so the same show could be listed twice (one link per host) —
-- three such pairs were found and archived in the 2026-10 feed cleanup.
-- Same key as 0022, plus the host alias. Keep in sync with
-- normalizeFeedUrl() in lib/dedupe-keys.js and feedKey() in lib/harvester.js.
-- Added as a NEW index alongside 0022's (dropping the old one needs a manual
-- confirmation the migration tool can't give). It is a strict superset of the
-- old one, which is now redundant but harmless. Its name still contains
-- "resources_live_feed_key", which is what lib/resources-db-admin.js matches to
-- raise DUPLICATE_FEED.

create unique index if not exists resources_live_feed_key_v2 on public.resources (
  regexp_replace(
    lower(regexp_replace(regexp_replace(btrim(rss_feed_url), '^https?://(www\.)?', '', 'i'), '/+$', '')),
    '^rss\.buzzsprout\.com/', 'feeds.buzzsprout.com/'
  )
)
where rss_feed_url is not null
  and btrim(rss_feed_url) <> ''
  and coalesce(status, '') <> 'Archived'
  and coalesce(submission_status, '') <> 'Rejected';
