// Dynamic spotlight — fetches the top-ranked podcasts and YouTube channels from Airtable,
// reads their RSS Feed URL field, then fetches the latest episode/video from each feed.
// Results are cached for 6 hours to avoid hammering feeds on every page load.

const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE  = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT    = process.env.AIRTABLE_PAT;

// How many of the top-ranked shows to spotlight
const TOP_PODCASTS = 5;
const TOP_VIDEOS   = 3;

// ─── Airtable fetch ──────────────────────────────────────────────────────────

async function fetchTopFromAirtable(type, limit) {
  if (!AIRTABLE_PAT) return [];

  const params = new URLSearchParams();
  params.set('filterByFormula', `AND({Type} = "${type}", {RSS Feed URL} != "")`);
  params.set('sort[0][field]', 'Final Score');
  params.set('sort[0][direction]', 'desc');
  params.set('maxRecords', String(limit));

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

  return {
    type:        'podcast',
    show:        meta.name,
    title:       title || 'New episode',
    url:         enclosureUrl || link,
    image:       episodeArt,
    date:        pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null,
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

  return {
    type:        'video',
    show:        meta.name,
    title:       title || 'New video',
    url:         videoId ? `https://www.youtube.com/watch?v=${videoId}` : meta.rssUrl,
    image:       thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null),
    date:        published ? new Date(published).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null,
    description: description.slice(0, 200),
    score:       meta.score,
  };
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DentHub/1.0 (+https://denthub-one.vercel.app)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let cache    = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  // 1. Fetch top-ranked podcasts and YouTube channels from Airtable
  const [podcastMeta, videoMeta] = await Promise.all([
    fetchTopFromAirtable('Podcast', TOP_PODCASTS),
    fetchTopFromAirtable('YouTube', TOP_VIDEOS),
  ]);

  // 2. Fetch their RSS feeds in parallel
  const [podcastResults, videoResults] = await Promise.all([
    Promise.all(
      podcastMeta.map(meta =>
        fetchFeed(meta.rssUrl)
          .then(xml => parsePodcastFeed(xml, meta))
          .catch(() => null)
      )
    ),
    Promise.all(
      videoMeta.map(meta =>
        fetchFeed(meta.rssUrl)
          .then(xml => parseYouTubeFeed(xml, meta))
          .catch(() => null)
      )
    ),
  ]);

  const data = {
    podcasts:  podcastResults.filter(Boolean),
    videos:    videoResults.filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };

  cache     = data;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(data);
}
