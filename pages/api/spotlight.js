// Fetches the latest episode/video from every podcast and YouTube channel in the database.
// Sorts all results by publish date and returns the 8 most recent of each type.
// Cached for 6 hours. Per-feed timeout is 4s so slow feeds don't hold up the batch.

const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE  = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT    = process.env.AIRTABLE_PAT;

const DISPLAY_COUNT = 4; // how many of each type to show in the grid

// ─── Airtable fetch ──────────────────────────────────────────────────────────

async function fetchAllFromAirtable(type) {
  if (!AIRTABLE_PAT) return [];

  const params = new URLSearchParams();
  params.set('filterByFormula', `AND({Type} = "${type}", {RSS Feed URL} != "", {Status} = "Published")`);

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return (json.records || []).map(r => ({
    name:   r.fields['Name'],
    type:   type,
    rssUrl: r.fields['RSS Feed URL'],
    score:  r.fields['Final Score'] || 0,
  }));
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

function parsePodcastFeed(xml, meta) {
  const showArt    = getAttr(xml, 'itunes:image', 'href') || null;
  const itemMatch  = xml.match(/<item[\s>]([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;
  const item = itemMatch[1];

  const title        = stripHtml(getTag(item, 'title'));
  const link         = getTag(item, 'link') || meta.rssUrl;
  const pubDate      = getTag(item, 'pubDate');
  const description  = stripHtml(getTag(item, 'description') || getTag(item, 'itunes:summary') || '');
  const episodeArt   = getAttr(item, 'itunes:image', 'href') || showArt;
  const enclosureUrl = getAttr(item, 'enclosure', 'url');
  const parsedDate   = pubDate ? new Date(pubDate) : null;

  return {
    type:        'podcast',
    show:        meta.name,
    title:       title || 'New episode',
    url:         enclosureUrl || link,
    image:       episodeArt,
    date:        parsedDate ? parsedDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null,
    sortDate:    parsedDate ? parsedDate.getTime() : 0,
    description: description.slice(0, 200),
    score:       meta.score,
  };
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

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  // 1. Fetch all podcasts and YouTube channels from Airtable
  const [podcastMeta, videoMeta] = await Promise.all([
    fetchAllFromAirtable('Podcast'),
    fetchAllFromAirtable('YouTube'),
  ]);

  // Deduplicate by RSS URL so shared feeds don't produce duplicate episode cards
  const uniquePodcastMeta = podcastMeta.filter((m, i, arr) => arr.findIndex(x => x.rssUrl === m.rssUrl) === i);
  const uniqueVideoMeta   = videoMeta.filter((m, i, arr) => arr.findIndex(x => x.rssUrl === m.rssUrl) === i);

  // 2. Fetch every RSS feed in parallel (4s timeout per feed — stragglers are dropped)
  const [podcastResults, videoResults] = await Promise.all([
    Promise.all(
      uniquePodcastMeta.map(meta =>
        fetchFeed(meta.rssUrl)
          .then(xml => parsePodcastFeed(xml, meta))
          .catch(() => null)
      )
    ),
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

  cache     = data;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(data);
}
