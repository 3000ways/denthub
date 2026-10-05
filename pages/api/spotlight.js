// "What's New": the latest episode from each podcast and the latest video from
// each YouTube channel, newest first, DISPLAY_COUNT of each. Cached 6 hours.
//
// Podcasts come from the Supabase episode archive (kept fresh by the daily
// harvester + refresh-on-view) — one fast query instead of a live sweep of ~200
// RSS feeds, which made the first visitor after every deploy/cache expiry stare
// at an empty "What's New" box for ~5s. YouTube channels aren't harvested, so
// those feeds are still fetched live (they're fast; 4s timeout per feed).

import { supabase } from '../../lib/supabase';
import { listPublishedResources } from '../../lib/resources-db';
import { setCdnCache } from '../../lib/cdn-cache';

const DISPLAY_COUNT = 12; // how many of each type to feed the "What's New" carousels

// ─── Resource fetch (Supabase) ───────────────────────────────────────────────

async function fetchAllFromAirtable(type) {
  try {
    const records = await listPublishedResources({
      type,
      hasRss: true,
      select: 'id, name, rss_feed_url, final_score',
    });
    return records.map(r => ({
      id:     r.id,
      name:   r.fields['Name'],
      type:   type,
      rssUrl: r.fields['RSS Feed URL'],
      score:  r.fields['Final Score'] || 0,
    }));
  } catch { return []; }
}

// ─── RSS / Atom parsing ───────────────────────────────────────────────────────

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
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#\d+;/g,'').replace(/&[a-z]+;/g,'').replace(/\s+/g,' ').trim();
}

function parseYouTubeFeed(xml, meta) {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry = entryMatch[1];

  const videoId    = getTag(entry, 'yt:videoId');
  const title      = stripHtml(getTag(entry, 'title'));
  const published  = getTag(entry, 'published');
  const description = stripHtml(getTag(entry, 'media:description') || '');
  const thumbnail  = getAttr(entry, 'media:thumbnail', 'url');
  const parsedDate = published ? new Date(published) : null;

  return {
    type:        'video',
    show:        meta.name,
    title:       title || 'New video',
    url:         videoId ? `https://www.youtube.com/watch?v=${videoId}` : meta.rssUrl,
    image:       thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null),
    date:        parsedDate ? parsedDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null,
    sortDate:    parsedDate ? parsedDate.getTime() : 0,
    description: description.slice(0, 200),
    score:       meta.score,
  };
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
    signal: AbortSignal.timeout(4000), // tight timeout — stragglers won't block the batch
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ─── Podcasts from the episode archive ───────────────────────────────────────

const RECENT_WINDOW = 400; // newest rows to scan; plenty to find DISPLAY_COUNT distinct shows

async function latestPodcastEpisodes(podcastMeta) {
  const byId = new Map(podcastMeta.map(m => [m.id, m]));
  const { data, error } = await supabase
    .from('episodes')
    .select('id, show_resource_id, show_name, title, description, published_at, audio_url, image, guid')
    .not('audio_url', 'is', null)
    .lte('published_at', new Date().toISOString()) // ignore future-dated feed items
    // nullsFirst:false matches episodes_published_at_idx (DESC NULLS LAST); plain
    // DESC means NULLS FIRST in Postgres, which skips the index and times out.
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(RECENT_WINDOW);
  if (error) throw new Error(`episodes: ${error.message}`);
  const seenShows = new Set();
  const out = [];
  for (const e of data || []) {
    const meta = byId.get(e.show_resource_id); // only live (Published) podcasts
    if (!meta || seenShows.has(e.show_resource_id)) continue;
    seenShows.add(e.show_resource_id);
    const d = e.published_at ? new Date(e.published_at) : null;
    out.push({
      type:        'podcast',
      show:        meta.name || e.show_name,
      resourceId:  meta.id,
      episodeId:   e.id,
      title:       e.title || 'New episode',
      url:         e.audio_url,
      guid:        e.guid || e.audio_url,
      image:       e.image || null,
      date:        d ? d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null,
      sortDate:    d ? d.getTime() : 0,
      description: stripHtml(e.description || '').slice(0, 200),
      score:       meta.score,
    });
  }
  return out;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    setCdnCache(res, 21600, { ageMs: Date.now() - cacheTime });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  // 1. Fetch all podcasts and YouTube channels from Airtable
  const [podcastMeta, videoMeta] = await Promise.all([
    fetchAllFromAirtable('Podcast'),
    fetchAllFromAirtable('YouTube'),
  ]);

  // Deduplicate by RSS URL so shared feeds don't produce duplicate video cards
  const uniqueVideoMeta   = videoMeta.filter((m, i, arr) => arr.findIndex(x => x.rssUrl === m.rssUrl) === i);

  // 2. Podcasts: one archive query. YouTube: live feeds in parallel (4s timeout
  //    each — stragglers are dropped). Both run at the same time.
  const [podcastResults, videoResults] = await Promise.all([
    latestPodcastEpisodes(podcastMeta).catch(() => []),
    Promise.all(
      uniqueVideoMeta.map(meta =>
        fetchFeed(meta.rssUrl)
          .then(xml => parseYouTubeFeed(xml, meta))
          .catch(() => null)
      )
    ),
  ]);

  // 3. Sort each type by publish date descending, dedupe by title, take the freshest DISPLAY_COUNT
  const seenTitles = new Set();
  const podcasts = podcastResults
    .filter(Boolean)
    .sort((a, b) => b.sortDate - a.sortDate)
    .filter(ep => { const key = ep.title.toLowerCase(); if (seenTitles.has(key)) return false; seenTitles.add(key); return true; })
    .slice(0, DISPLAY_COUNT);

  const seenVideoTitles = new Set();
  const videos = videoResults
    .filter(Boolean)
    .sort((a, b) => b.sortDate - a.sortDate)
    .filter(ep => { const key = ep.title.toLowerCase(); if (seenVideoTitles.has(key)) return false; seenVideoTitles.add(key); return true; })
    .slice(0, DISPLAY_COUNT);

  const data = {
    podcasts,
    videos,
    fetchedAt: new Date().toISOString(),
  };

  // Don't pin an empty/failed result for 6 hours: if the archive query failed
  // (no podcasts), serve it briefly and try again on the next request.
  if (podcasts.length === 0) {
    setCdnCache(res, 60, { staleSec: 60 });
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  }

  cache     = data;
  cacheTime = Date.now();

  setCdnCache(res, 21600);
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(data);
}
