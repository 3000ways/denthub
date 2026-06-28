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
const FEED_TIMEOUT = 8000;
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

async function fetchFeedText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FEED_TIMEOUT),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Reads a feed and follows rel="next" pagination to assemble the full catalog.
async function fetchAllEpisodes(rssUrl) {
  const seen = new Map(); // guid -> episode (first/newest wins)
  let url = rssUrl;
  let pages = 0;

  while (url && pages < MAX_PAGES && seen.size < MAX_ITEMS) {
    const xml = await fetchFeedText(url);
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

async function countEpisodes(admin, showId) {
  const { count } = await admin
    .from('episodes')
    .select('id', { count: 'exact', head: true })
    .eq('show_resource_id', showId);
  return count || 0;
}

// ─── Orchestration ───────────────────────────────────────────────────────────

// Harvests up to `limit` shows, least-recently-harvested first, stopping early
// if `timeBudgetMs` is exhausted so the serverless function never times out.
export async function harvestBatch({ limit = 25, timeBudgetMs = 50000 } = {}) {
  const startedAt = Date.now();
  const admin = getSupabaseAdmin();

  // 1. Reconcile the show list from Airtable into harvest_state (new shows get
  //    a row with a null last_harvested_at so they sort to the front).
  const shows = await fetchPublishedPodcasts();
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

  // 2. Pick the least-recently-harvested shows that still exist in Airtable.
  const { data: stateRows } = await admin
    .from('harvest_state')
    .select('show_resource_id, last_harvested_at')
    .order('last_harvested_at', { ascending: true, nullsFirst: true });

  const queue = (stateRows || [])
    .filter(r => showById.has(r.show_resource_id))
    .slice(0, limit);

  // 3. Harvest each show within the time budget.
  const results = [];
  for (const { show_resource_id } of queue) {
    if (Date.now() - startedAt > timeBudgetMs) break;
    const show = showById.get(show_resource_id);
    try {
      const episodes = await fetchAllEpisodes(show.rssUrl);
      await upsertEpisodes(admin, show, episodes);
      const total = await countEpisodes(admin, show.id);
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
