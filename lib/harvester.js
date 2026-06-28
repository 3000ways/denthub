// Episode harvester (Phase A).
//
// Reads the list of published podcasts from Airtable, fetches each show's RSS
// feed (following pagination so we capture the full back-catalog, not just the
// first page), and upserts every episode into the Supabase `episodes` table.
//
// RSS-first by design: for our shows we already have the feed URL in Airtable,
// and the major hosts (Libsyn, Buzzsprout, Captivate, Transistor, Art19, ...)
// publish the complete catalog in the feed. No external search API dependency.
//
// Per-show progress is tracked in `harvest_state`, which lets a run process the
// least-recently-harvested shows first (so a tight serverless time budget still
// makes steady progress) and powers the coverage report.

import { getSupabaseAdmin } from './supabase-admin';

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

const DESC_CAP   = 4000;  // ~4 KB cap on stored description (keeps DB + index lean)
const MAX_PAGES  = 50;    // safety cap on RSS pagination chasing
const MAX_ITEMS  = 5000;  // safety cap on episodes harvested per show
const FEED_TIMEOUT     = 15000; // default per-fetch timeout
const FEED_TIMEOUT_MAX = 30000; // cap for a single slow big-feed download
const WALL_CLOCK_MS    = 58000; // hard ceiling per invocation (under Vercel's 60s)
const USER_AGENT = 'TheDentalCommute/1.0 (+https://thedentalcommute.com)';

// ─── Airtable: which shows to harvest ────────────────────────────────────────

async function fetchPublishedPodcasts() {
  if (!AIRTABLE_PAT) throw new Error('AIRTABLE_PAT not configured');
  const params = new URLSearchParams();
  params.set('filterByFormula', `AND({Type} = "Podcast", {RSS Feed URL} != "", {Status} = "Published")`);
  params.set('pageSize', '100');

  const out = [];
  let offset;
  do {
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Airtable ${res.status}`);
    const json = await res.json();
    for (const r of json.records || []) {
      if (r.fields['RSS Feed URL']) {
        out.push({ id: r.id, name: r.fields['Name'] || '(untitled)', rssUrl: r.fields['RSS Feed URL'] });
      }
    }
    offset = json.offset;
  } while (offset);
  return out;
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

// Some stored "feed" URLs are actually a webpage (Apple Podcasts, an rss.com
// listing page, a Spreaker page) rather than the RSS feed itself. Resolve those
// to the real feed URL so the show harvests instead of returning 0 episodes.
// Heuristic and best-effort: on any failure we return the original URL unchanged
// (no worse than before). Runs on Vercel, where outbound fetch works.
async function resolveFeedUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let u;
  try { u = new URL(rawUrl); } catch { return rawUrl; }
  const host = u.hostname.replace(/^www\./, '');

  // Apple Podcasts page -> real feed via the public iTunes lookup API.
  const appleId = host.endsWith('apple.com') && u.pathname.match(/\/id(\d+)/);
  if (appleId) {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${appleId[1]}&entity=podcast`, {
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const j = await r.json();
        const feed = j.results && j.results[0] && j.results[0].feedUrl;
        if (feed) return feed;
      }
    } catch { /* fall through */ }
    return rawUrl;
  }

  // rss.com listing page (rss.com/podcasts/<slug>/) -> media feed.
  if (host === 'rss.com') {
    const m = u.pathname.match(/\/podcasts\/([^/]+)/);
    if (m) return `https://media.rss.com/${m[1]}/feed.xml`;
  }

  // Spreaker page (/podcast/<slug>--<id> or /show/<id>/...) -> show feed.
  if (host === 'spreaker.com') {
    const m = u.pathname.match(/--(\d+)/) || u.pathname.match(/\/show\/(\d+)/);
    if (m) return `https://www.spreaker.com/show/${m[1]}/episodes/feed`;
  }

  return rawUrl;
}

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

async function deleteEpisodesById(admin, showId) {
  const n = await countEpisodesById(admin, showId);
  if (n > 0) await admin.from('episodes').delete().eq('show_resource_id', showId);
  return n;
}

// Reads a feed and follows rel="next" pagination to assemble the catalog.
// `deadline` (epoch ms) bounds total time for this show; each page fetch is
// allowed up to the time remaining (capped at FEED_TIMEOUT_MAX) so a single
// slow big-feed download gets real headroom without overrunning the function.
// `maxPages` lets an incremental refresh fetch only the newest page.
async function fetchAllEpisodes(rssUrl, deadline = Infinity, maxPages = MAX_PAGES) {
  const seen = new Map(); // guid -> episode (first/newest wins)
  let url = rssUrl;
  let pages = 0;

  while (url && pages < maxPages && seen.size < MAX_ITEMS) {
    const remaining = deadline === Infinity ? FEED_TIMEOUT : deadline - Date.now();
    if (remaining <= 0) break;
    const xml = await fetchFeedText(url, Math.min(FEED_TIMEOUT_MAX, remaining));
    for (const ep of parseItems(xml)) {
      if (!seen.has(ep.guid)) seen.set(ep.guid, ep);
    }
    const next = findNextPage(xml);
    url = next && next !== url ? next : null;
    pages += 1;
  }
  return [...seen.values()].slice(0, MAX_ITEMS);
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
export async function harvestBatch({ limit = 75, timeBudgetMs = 50000 } = {}) {
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
      const episodes = await fetchAllEpisodes(feedUrl, deadline, seeded ? 1 : MAX_PAGES);
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
