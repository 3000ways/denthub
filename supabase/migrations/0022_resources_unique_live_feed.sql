-- 0022: No two live resources may share an RSS feed.
--
-- One feed = one show. The 2026-10 audit found ~23 shows listed 2–4 times
-- (mostly Research-agent inserts under a different name/URL but the same feed),
-- which also duplicated 1,248 episodes across shows. The code-level dedup in
-- lib/dedupe-keys.js now catches these, but this index makes it impossible at
-- the database level — from any writer (Research agent, Submit form, admin
-- editor, feed repair).
--
-- "Live" = not Archived and not a Rejected submission, so archived duplicates
-- and rejected suggestions can keep their old feed without blocking anything.
-- The key is the feed URL lowercased, without scheme, "www." or trailing
-- slashes, so http://www.x.com/feed/ and https://x.com/feed collide.
--
-- Writers catch the violation (Postgres 23505 on this index name) and turn it
-- into a friendly "already listed" — see lib/resources-db-admin.js.

create unique index resources_live_feed_key on public.resources (
  lower(regexp_replace(regexp_replace(btrim(rss_feed_url), '^https?://(www\.)?', '', 'i'), '/+$', ''))
)
where rss_feed_url is not null
  and btrim(rss_feed_url) <> ''
  and coalesce(status, '') <> 'Archived'
  and coalesce(submission_status, '') <> 'Rejected';
