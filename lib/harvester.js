// Episode harvester (Phase A).
//
// Reads the list of published podcasts from the Supabase `resources` table,
// fetches each show's RSS feed (following pagination so we capture the full
// back-catalog, not just the first page), and upserts every episode into the
// Supabase `episodes` table.
//
// RSS-first by design: for our shows we already have the feed URL stored,
// and the major hosts (Libsyn, Buzzsprout, Captivate, Transistor, Art19, ...)
// publish the complete catalog in the feed. No external search API dependency.
//
// Per-show progress is tracked in `harvest_state`, which lets a run process the
// least-recently-harvested shows first (so a tight serverless time budget still
// makes steady progress) and powers the coverage report.

import { getSupabaseAdmin } from './supabase-admin';
import { adminListResources, adminGetResource, adminUpdateResource } from './resources-db-admin';
import { resolveFeedUrl, resolvePodcastFeed } from './resolve-feed';

// Re-export so existing importers (fix-feeds.js) keep working after the move.
export { resolveFeedUrl } from './resolve-feed';

const DESC_CAP   = 4000;  // ~4 KB cap on stored description (keeps DB + index lean)
const MAX_PAGES  = 50;    // safety cap on RSS pagination chasing
const MAX_ITEMS  = 5000;  // safety cap on episodes harvested per show
const FEED_TIMEOUT     = 15000; // default per-fetch timeout
const FEED_TIMEOUT_MAX = 30000; // cap for a single slow big-feed download
const WALL_CLOCK_MS    = 48000; // hard ceiling per invocation (well under Vercel's 60s, leaving margin for post-processing + network)
// Browser-like UA: many podcast hosts return 403/empty to identified bots, so
// fetch (and the feed verifier in fix-feeds) present as a normal browser.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── Airtable: which shows to harvest ────────────────────────────────────────

async function fetchPublishedPodcasts() {
  const records = await adminListResources({
    type: 'Podcast', status: 'Published', hasRss: true,
    select: 'id, name, rss_feed_url',
  });
  return records.map(r => ({
    id: r.id,
    name: r.fields['Name'] || '(untitled)',
    rssUrl: r.fields['RSS Feed URL'],
  }));
}

// ─── RSS / Atom parsing ──────────────────────────────────────────────────────

function getTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
}
function getAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}
function stripHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '').replace(/\s+/g, ' ').trim();
}

// itunes:duration may be "3723", "62:03", or "1:02:03".
function parseDuration(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const parts = s.split(':').map(n => parseInt(n, 10));
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

// The "next page" link of a paginated feed (RFC 5005 / Atom rel="next").
function findNextPage(xml) {
  const linkTags = xml.match(/<(?:atom:)?link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    if (/rel=["']next["']/i.test(tag)) {
      const href = tag.match(/href=["']([^"']+)["']/i);
      if (href) return href[1];
    }
  }
  return null;
}

function parseItems(xml, showArtFallback) {
  const showArt = getAttr(xml, 'itunes:image', 'href') || getTag(xml, 'url') || showArtFallback || null;
  const items = [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)];

  return items.map(([, item]) => {
    const title    = stripHtml(getTag(item, 'title')) || 'Untitled episode';
    const link     = getTag(item, 'link');
    const enclosure = getAttr(item, 'enclosure', 'url');
    const pubDate  = getTag(item, 'pubDate');
    const parsed   = pubDate ? new Date(pubDate) : null;
    // Prefer description / itunes:summary (a blurb). Deliberately NOT
    // content:encoded, which is where some shows dump full transcripts —
    // those are a Phase C concern, captured separately, not here.
    const rawDesc  = getTag(item, 'description') || getTag(item, 'itunes:summary') || '';
    const image    = getAttr(item, 'itunes:image', 'href') || showArt;

    // Stable per-episode id: <guid>, else the audio URL, else the link, else
    // a title+date composite. Used with show_resource_id to dedupe on upsert.
    const guid = getTag(item, 'guid') || enclosure || link || `${title}::${pubDate || ''}`;

    return {
      guid,
      title,
      description: stripHtml(rawDesc).slice(0, DESC_CAP),
      published_at: parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      link: link || null,
      audio_url: enclosure || null,
      image: image || null,
      duration_seconds: parseDuration(getTag(item, 'itunes:duration')),
    };
  });
}

async function fetchFeedText(url, timeoutMs = FEED_TIMEOUT) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// resolveFeedUrl (platform-page → feed) now lives in lib/resolve-feed.js so the
// Research agent and this harvester share one implementation. Re-exported below
// for existing importers (e.g. pages/api/admin/fix-feeds.js).

// Normalized key for grouping shows that point at the same feed (exact-duplicate
// resources added multiple times in Airtable).
function feedKey(url) {
  return (url || '')
    .trim().toLowerCase()
    .replace('://rss.buzzsprout.com', '://feeds.buzzsprout.com') // same feed, two host aliases
    .replace(/\/+$/, '');
}

async function countEpisodesById(admin, showId) {
  const { count } = await admin
    .from('episodes')
    .select('id', { count: 'exact', head: true })
    .eq('show_resource_id', showId);
  return count || 0;
}

// Deletes a show's episodes during dedup/orphan pruning — but NEVER deletes an
// episode that a user has data attached to. Episodes cascade-delete into
// listening_progress (CE history), episode_bookmarks, pins, and reports, so
// blindly removing a show's episodes would silently destroy irreplaceable user
// records (e.g. a dentist's CE documentation). We therefore protect any episode
// referenced by user data and delete only the rest.
async function deleteEpisodesById(admin, showId) {
  const { data: eps } = await admin.from('episodes').select('id').eq('show_resource_id', showId);
  const ids = (eps || []).map(e => e.id);
  if (ids.length === 0) return 0;

  // Collect episode ids referenced by user data (chunk the .in() lookups so a
  // large back-catalog doesn't overflow the query).
  const CHUNK = 200;
  const protectedIds = new Set();
  for (const table of ['listening_progress', 'episode_bookmarks', 'pins']) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      const { data } = await admin.from(table).select('episode_id').in('episode_id', slice);
      (data || []).forEach(r => { if (r.episode_id != null) protectedIds.add(r.episode_id); });
    }
  }

  const deletable = ids.filter(id => !protectedIds.has(id));
  if (deletable.length === 0) return 0;
  for (let i = 0; i < deletable.length; i += CHUNK) {
    await admin.from('episodes').delete().in('id', deletable.slice(i, i + CHUNK));
  }
  return deletable.length;
}

// Reads a feed and follows rel="next" pagination to assemble the catalog.
// `deadline` (epoch ms) bounds total time for this show; each page fetch is
// allowed up to the time remaining (capped at FEED_TIMEOUT_MAX) so a single
// slow big-feed download gets real headroom without overrunning the function.
// `maxPages` lets an incremental refresh fetch only the newest page.
//
// Returns { episodes, showArt }. `showArt` is the channel-level artwork
// (<itunes:image> or <image><url>) from the first page — the show's own cover,
// which feeds the resource-icon "auto box" (Airtable "Auto Image URL").
async function fetchAllEpisodes(rssUrl, deadline = Infinity, maxPages = MAX_PAGES) {
  const seen = new Map(); // guid -> episode (first/newest wins)
  let url = rssUrl;
  let pages = 0;
  let showArt = null;

  while (url && pages < maxPages && seen.size < MAX_ITEMS) {
    const remaining = deadline === Infinity ? FEED_TIMEOUT : deadline - Date.now();
    if (remaining <= 0) break;
    const xml = await fetchFeedText(url, Math.min(FEED_TIMEOUT_MAX, remaining));
    if (pages === 0) showArt = getAttr(xml, 'itunes:image', 'href') || getTag(xml, 'url') || null;
    for (const ep of parseItems(xml)) {
      if (!seen.has(ep.guid)) seen.set(ep.guid, ep);
    }
    const next = findNextPage(xml);
    url = next && next !== url ? next : null;
    pages += 1;
  }
  return { episodes: [...seen.values()].slice(0, MAX_ITEMS), showArt };
}

// Write the show's RSS cover art into Airtable's "Auto Image URL" field (the
// machine "auto box" of the resource-icon ladder). Best-effort and idempotent —
// any failure is swallowed so it can never fail a harvest. Never touches the
// human "Image URL" field, so a hand-picked or owner logo is always safe.
async function updateAirtableAutoImage(showId, showArt) {
  if (!showArt) return;
  try {
    await adminUpdateResource(showId, { 'Auto Image URL': showArt });
  } catch { /* never fail the harvest over an artwork write */ }
}

// ─── Supabase writes ─────────────────────────────────────────────────────────

async function upsertEpisodes(admin, show, episodes) {
  if (!episodes.length) return;
  const rows = episodes.map(ep => ({
    show_resource_id: show.id,
    show_name: show.name,
    guid: ep.guid,
    title: ep.title,
    description: ep.description,
    published_at: ep.published_at,
    link: ep.link,
    audio_url: ep.audio_url,
    image: ep.image,
    duration_seconds: ep.duration_seconds,
    updated_at: new Date().toISOString(),
    // created_at and fts deliberately omitted: created_at keeps its insert
    // default and is preserved on update; fts is a generated column.
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await admin
      .from('episodes')
      .upsert(chunk, { onConflict: 'show_resource_id,guid' });
    if (error) throw new Error(error.message);
  }
}

// ─── Orchestration ───────────────────────────────────────────────────────────

// Harvests up to `limit` shows, least-recently-harvested first, stopping early
// if `timeBudgetMs` is exhausted so the serverless function never times out.
// Also de-duplicates: when several Airtable records share one feed it keeps a
// single canonical show and purges the others' (duplicate) episodes, and removes
// episodes for shows no longer present in Airtable.
export async function harvestBatch({ limit = 75, timeBudgetMs = 38000 } = {}) {
  const startedAt = Date.now();
  const admin = getSupabaseAdmin();

  // 1. Reconcile the show list from Airtable into harvest_state.
  const shows = await fetchPublishedPodcasts();
  const airtableHealthy = shows.length > 50; // guard before any destructive prune
  if (shows.length) {
    await admin.from('harvest_state').upsert(
      shows.map(s => ({
        show_resource_id: s.id,
        show_name: s.name,
        feed_url: s.rssUrl,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'show_resource_id' }
    );
  }
  const showById = new Map(shows.map(s => [s.id, s]));

  // 2. De-duplicate by feed: group shows that point at the same feed, keep the
  //    one that already has the most episodes (tie-break by id), and mark the
  //    rest as duplicates, deleting their (redundant) episodes.
  const { data: countRows } = await admin
    .from('harvest_state')
    .select('show_resource_id, episode_count');
  const countById = new Map((countRows || []).map(r => [r.show_resource_id, r.episode_count || 0]));

  const groups = new Map();
  for (const s of shows) {
    const key = feedKey(s.rssUrl);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const canonical = new Set();
  let duplicatesMarked = 0;
  let dupEpisodesDeleted = 0;
  for (const group of groups.values()) {
    group.sort((a, b) => (countById.get(b.id) || 0) - (countById.get(a.id) || 0) || (a.id < b.id ? -1 : 1));
    canonical.add(group[0].id);
    for (const dup of group.slice(1)) {
      if (Date.now() - startedAt > timeBudgetMs) break;
      dupEpisodesDeleted += await deleteEpisodesById(admin, dup.id);
      duplicatesMarked += 1;
      await admin.from('harvest_state').update({
        last_status: 'duplicate',
        last_error: `Duplicate of "${group[0].name}"`,
        episode_count: 0,
        last_harvested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('show_resource_id', dup.id);
    }
  }

  // 3. Prune orphans: shows we've harvested before that are no longer published
  //    in Airtable (e.g. deleted/merged). Guarded by a healthy Airtable read.
  let orphanEpisodesDeleted = 0;
  if (airtableHealthy) {
    const activeIds = new Set(shows.map(s => s.id));
    for (const row of countRows || []) {
      if (activeIds.has(row.show_resource_id)) continue;
      if (Date.now() - startedAt > timeBudgetMs) break;
      orphanEpisodesDeleted += await deleteEpisodesById(admin, row.show_resource_id);
      await admin.from('harvest_state').delete().eq('show_resource_id', row.show_resource_id);
    }
  }

  // 4. Pick the least-recently-harvested canonical shows to harvest this run.
  const { data: stateRows } = await admin
    .from('harvest_state')
    .select('show_resource_id, last_harvested_at')
    .order('last_harvested_at', { ascending: true, nullsFirst: true });

  const queue = (stateRows || [])
    .filter(r => canonical.has(r.show_resource_id))
    .slice(0, limit);

  // 5. Harvest each show within the remaining time budget.
  const results = [];
  for (const { show_resource_id } of queue) {
    if (Date.now() - startedAt > timeBudgetMs) break;
    const show = showById.get(show_resource_id);
    try {
      const feedUrl = await resolveFeedUrl(show.rssUrl);
      // Give this show whatever time is left up to the per-invocation wall
      // (capped at FEED_TIMEOUT_MAX), so a slow big feed gets real headroom but
      // can never push the function past Vercel's 60s limit.
      const deadline = Math.min(startedAt + WALL_CLOCK_MS, Date.now() + FEED_TIMEOUT_MAX);
      // Already-seeded shows only need the newest page (new episodes sit at the
      // top); brand-new shows get the full back-catalog. Avoids re-downloading
      // a 1,500-episode feed on every refresh.
      const seeded = (countById.get(show.id) || 0) > 0;
      const { episodes, showArt } = await fetchAllEpisodes(feedUrl, deadline, seeded ? 1 : MAX_PAGES);
      await upsertEpisodes(admin, show, episodes);
      const total = await countEpisodesById(admin, show.id);
      await admin.from('harvest_state').update({
        last_harvested_at: new Date().toISOString(),
        last_status: 'ok',
        last_error: null,
        episode_count: total,
        show_name: show.name,
        feed_url: show.rssUrl,
        updated_at: new Date().toISOString(),
      }).eq('show_resource_id', show.id);
      // Refresh the resource-icon "auto box" with the show's own RSS cover art.
      await updateAirtableAutoImage(show.id, showArt);
      results.push({ show: show.name, fetched: episodes.length, total, status: 'ok' });
    } catch (err) {
      await admin.from('harvest_state').update({
        last_harvested_at: new Date().toISOString(),
        last_status: 'error',
        last_error: String(err.message || err).slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq('show_resource_id', show.id);
      results.push({ show: show.name, status: 'error', error: String(err.message || err) });
    }
  }

  return {
    processed: results.length,
    totalShows: shows.length,
    canonicalShows: canonical.size,
    duplicatesMarked,
    dupEpisodesDeleted,
    orphanEpisodesDeleted,
    elapsedMs: Date.now() - startedAt,
    results,
  };
}

// Refresh a SINGLE show's archive on demand — powers "refresh-on-view" so the
// "All Episodes" list is current the moment a visitor opens a podcast page,
// without waiting for the nightly batch. Throttled: if the show was harvested
// within `throttleMs`, it's a no-op that just reports the current count (so a
// popular show isn't re-harvested on every page view). Only ever touches this
// one show; feed URL is looked up server-side (never client-supplied).
export async function harvestShow(showId, { throttleMs = 6 * 60 * 60 * 1000 } = {}) {
  if (!showId) return { skipped: true, reason: 'no_id' };
  const admin = getSupabaseAdmin();

  const { data: stateRow } = await admin
    .from('harvest_state')
    .select('show_name, feed_url, episode_count, last_harvested_at, last_status')
    .eq('show_resource_id', showId)
    .maybeSingle();

  const episodeCount = stateRow?.episode_count || 0;

  // Duplicate shows are covered by their canonical twin — never harvest here.
  if (stateRow?.last_status === 'duplicate') {
    return { skipped: true, reason: 'duplicate', total: episodeCount };
  }

  // Throttle: harvested recently and last run was fine → cheap no-op. (An
  // errored last run is allowed to retry immediately.)
  if (stateRow?.last_harvested_at && stateRow.last_status !== 'error' &&
      Date.now() - new Date(stateRow.last_harvested_at).getTime() < throttleMs) {
    return { skipped: true, reason: 'throttled', total: episodeCount };
  }

  // Feed URL comes from harvest_state; fall back to Airtable for a brand-new
  // show we haven't tracked yet (and confirm it's actually a podcast).
  let name = stateRow?.show_name;
  let feedUrlRaw = stateRow?.feed_url;
  if (!feedUrlRaw) {
    try {
      const rec = await adminGetResource(showId, { select: 'id, name, type, rss_feed_url' });
      if (rec) {
        if (rec.fields?.Type !== 'Podcast') return { skipped: true, reason: 'not_podcast' };
        name = rec.fields?.Name || name;
        feedUrlRaw = rec.fields?.['RSS Feed URL'];
      }
    } catch { /* fall through to no_feed */ }
  }
  if (!feedUrlRaw) return { skipped: true, reason: 'no_feed' };

  const show = { id: showId, name: name || '(untitled)', rssUrl: feedUrlRaw };
  try {
    // Make sure a harvest_state row exists so status/count land somewhere.
    await admin.from('harvest_state').upsert(
      { show_resource_id: showId, show_name: show.name, feed_url: feedUrlRaw, updated_at: new Date().toISOString() },
      { onConflict: 'show_resource_id' }
    );
    const feedUrl = await resolveFeedUrl(feedUrlRaw);
    const deadline = Date.now() + FEED_TIMEOUT_MAX;
    // Seeded shows only need the newest page; a never-seen show gets the full
    // back-catalog on this first view.
    const seeded = episodeCount > 0;
    const { episodes, showArt } = await fetchAllEpisodes(feedUrl, deadline, seeded ? 1 : MAX_PAGES);
    await upsertEpisodes(admin, show, episodes);
    const total = await countEpisodesById(admin, show.id);
    await admin.from('harvest_state').update({
      last_harvested_at: new Date().toISOString(),
      last_status: 'ok',
      last_error: null,
      episode_count: total,
      show_name: show.name,
      feed_url: feedUrlRaw,
      updated_at: new Date().toISOString(),
    }).eq('show_resource_id', show.id);
    await updateAirtableAutoImage(show.id, showArt);
    return { refreshed: true, fetched: episodes.length, total };
  } catch (err) {
    await admin.from('harvest_state').update({
      last_harvested_at: new Date().toISOString(),
      last_status: 'error',
      last_error: String(err.message || err).slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('show_resource_id', show.id);
    return { error: String(err.message || err) };
  }
}

// Self-heal missing feeds: find published podcasts with an empty RSS Feed URL and
// resolve one deterministically (iTunes lookup/search + homepage discovery, each
// candidate verified to return episodes), writing it back to Airtable so the show
// enters the harvest queue on its own. This closes the gap that stranded podcasts
// the Research agent added without a feed. Bounded by `limit` + `timeBudgetMs`;
// best-effort (never throws), so it's safe to call opportunistically from the cron.
export async function repairMissingFeeds({ limit = 5, timeBudgetMs = 15000 } = {}) {
  const startedAt = Date.now();

  let records = [];
  try {
    records = await adminListResources({
      type: 'Podcast', status: 'Published', hasRss: false,
      select: 'id, name, url',
    });
  } catch { return { repaired: 0, checked: 0, error: 'resources_read' }; }

  let repaired = 0, checked = 0;
  const results = [];
  for (const rec of records) {
    if (checked >= limit || Date.now() - startedAt > timeBudgetMs) break;
    checked += 1;
    const name = rec.fields?.Name;
    const url  = rec.fields?.URL;
    const hit = await resolvePodcastFeed({ name, url });
    if (!hit || !hit.feedUrl) continue;
    try {
      await adminUpdateResource(rec.id, { 'RSS Feed URL': hit.feedUrl });
      repaired += 1;
      results.push({ name, feedUrl: hit.feedUrl, source: hit.source });
    } catch { /* skip this one on write error, keep going */ }
  }
  return { repaired, checked, total: records.length, results };
}

// Coverage report: every tracked show with how many episodes we hold and when
// it was last harvested. Lets us spot shows whose feeds look truncated.
export async function getCoverage() {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('harvest_state')
    .select('show_name, feed_url, episode_count, last_harvested_at, last_status, last_error')
    .order('episode_count', { ascending: true });
  return data || [];
}

// Activity stats — a "the harvester is working" snapshot for the admin tab.
// New-episode counts come from episodes.created_at (set once, on first insert),
// so no schema change is needed.
export async function getStats() {
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const since = ms => new Date(now - ms).toISOString();
  const DAY = 86400000;
  const epCount = (q) => q.then(r => r.count || 0);

  const [added24h, added7d, totalEpisodes, showsRefreshed24h, errors, lastRow] = await Promise.all([
    epCount(admin.from('episodes').select('id', { count: 'exact', head: true }).gte('created_at', since(DAY))),
    epCount(admin.from('episodes').select('id', { count: 'exact', head: true }).gte('created_at', since(7 * DAY))),
    epCount(admin.from('episodes').select('id', { count: 'exact', head: true })),
    epCount(admin.from('harvest_state').select('show_resource_id', { count: 'exact', head: true })
      .gte('last_harvested_at', since(DAY)).neq('last_status', 'duplicate')),
    epCount(admin.from('harvest_state').select('show_resource_id', { count: 'exact', head: true })
      .eq('last_status', 'error')),
    admin.from('harvest_state').select('last_harvested_at')
      .order('last_harvested_at', { ascending: false, nullsFirst: false }).limit(1),
  ]);

  return {
    added24h,
    added7d,
    totalEpisodes,
    showsRefreshed24h,
    errors,
    lastHarvestAt: (lastRow.data && lastRow.data[0] && lastRow.data[0].last_harvested_at) || null,
  };
}
