// "New from your bookmarks" feed.
// Given a set of bookmarked resource IDs, fetches those records from Airtable,
// keeps the ones that are Podcasts / YouTube channels with an RSS feed, and
// returns their most recent episodes/videos merged and sorted by date.
// Same live-RSS approach as /api/spotlight, but pointed at the user's shows.

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

const PER_FEED  = 3;   // most recent items to pull from each followed show
const MAX_IDS   = 60;  // safety cap on how many shows we'll fan out to
const MAX_ITEMS = 24;  // cap on the merged feed length

// ─── RSS / Atom parsing (shared shape with /api/spotlight) ───────────────────

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
const fmtDate = d => d ? d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;

function parsePodcastItems(xml, meta, limit) {
  const showArt = getAttr(xml, 'itunes:image', 'href') || meta.image || null;
  const items = [...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi)].slice(0, limit);
  return items.map(([, item]) => {
    const pubDate    = getTag(item, 'pubDate');
    const parsedDate = pubDate ? new Date(pubDate) : null;
    const enclosure  = getAttr(item, 'enclosure', 'url');
    return {
      resourceId: meta.id,
      type:       'podcast',
      show:       meta.name,
      title:      stripHtml(getTag(item, 'title')) || 'New episode',
      url:        enclosure || getTag(item, 'link') || meta.rssUrl,
      image:      getAttr(item, 'itunes:image', 'href') || showArt,
      date:       fmtDate(parsedDate),
      sortDate:   parsedDate ? parsedDate.getTime() : 0,
      description: stripHtml(getTag(item, 'description') || getTag(item, 'itunes:summary') || '').slice(0, 200),
    };
  });
}

function parseYouTubeItems(xml, meta, limit) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].slice(0, limit);
  return entries.map(([, entry]) => {
    const videoId    = getTag(entry, 'yt:videoId');
    const published  = getTag(entry, 'published');
    const parsedDate = published ? new Date(published) : null;
    return {
      resourceId: meta.id,
      type:       'video',
      show:       meta.name,
      title:      stripHtml(getTag(entry, 'title')) || 'New video',
      url:        videoId ? `https://www.youtube.com/watch?v=${videoId}` : meta.rssUrl,
      image:      getAttr(entry, 'media:thumbnail', 'url') || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : meta.image),
      date:       fmtDate(parsedDate),
      sortDate:   parsedDate ? parsedDate.getTime() : 0,
      description: stripHtml(getTag(entry, 'media:description') || '').slice(0, 200),
    };
  });
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchRecords(ids) {
  if (!AIRTABLE_PAT || !ids.length) return [];
  const formula = `AND({Status}='Published', {RSS Feed URL}!='', OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')}))`;
  const params = new URLSearchParams();
  params.set('filterByFormula', formula);
  params.set('pageSize', '100');
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.records || []).map(r => ({
    id:     r.id,
    name:   r.fields['Name'],
    type:   r.fields['Type'],
    rssUrl: r.fields['RSS Feed URL'],
    image:  r.fields['Image URL'] || null,
  }));
}

// ─── Tiny in-memory cache, keyed by the set of show IDs ──────────────────────
const cache = new Map(); // key -> { data, time }
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export default async function handler(req, res) {
  const raw = (req.query.ids || '').toString();
  const ids = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))].slice(0, MAX_IDS);

  if (ids.length === 0) return res.status(200).json({ episodes: [] });

  const key = [...ids].sort().join(',');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(hit.data);
  }

  const records = await fetchRecords(ids);
  const shows = records.filter(r => r.rssUrl && (r.type === 'Podcast' || r.type === 'YouTube'));

  const results = await Promise.all(
    shows.map(meta =>
      fetchFeed(meta.rssUrl)
        .then(xml => meta.type === 'Podcast'
          ? parsePodcastItems(xml, meta, PER_FEED)
          : parseYouTubeItems(xml, meta, PER_FEED))
        .catch(() => [])
    )
  );

  const episodes = results
    .flat()
    .filter(e => e.sortDate > 0)
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, MAX_ITEMS);

  const data = { episodes, followedShows: shows.length, fetchedAt: new Date().toISOString() };
  cache.set(key, { data, time: Date.now() });

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(data);
}
