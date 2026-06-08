// Episode search — fetches all dental podcast RSS feeds from Airtable,
// parses every episode, and filters by the search query.
// Results are cached for 2 hours to avoid hammering feeds on every search.

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

// ─── In-memory cache for parsed episodes ─────────────────────────────────────
let episodeCache    = null;
let episodeCacheTime = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

function formatDuration(raw) {
  if (!raw) return null;
  // Could be "HH:MM:SS", "MM:SS", or seconds as string
  if (raw.includes(':')) {
    const parts = raw.split(':').map(Number);
    if (parts.length === 3) {
      const [h, m] = parts;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    if (parts.length === 2) {
      const [m] = parts;
      return `${m}m`;
    }
  }
  const secs = parseInt(raw, 10);
  if (!isNaN(secs)) {
    const m = Math.floor(secs / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  }
  return null;
}

function parseAllEpisodes(xml, podcastName, showImage) {
  const episodes = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  const podcastArt = getAttr(xml, 'itunes:image', 'href') || showImage || null;

  while ((match = itemRe.exec(xml)) !== null) {
    const item = match[1];
    const title = stripHtml(getTag(item, 'title'));
    if (!title) continue;

    const description = stripHtml(
      getTag(item, 'description') || getTag(item, 'itunes:summary') || ''
    );
    const pubDate   = getTag(item, 'pubDate');
    const image     = getAttr(item, 'itunes:image', 'href') || podcastArt;
    const audioUrl  = getAttr(item, 'enclosure', 'url');
    const link      = getTag(item, 'link');
    const duration  = formatDuration(getTag(item, 'itunes:duration'));
    const dateMs    = pubDate ? new Date(pubDate).getTime() : 0;

    episodes.push({
      podcast:     podcastName,
      title,
      description,
      image,
      audioUrl,
      url:         audioUrl || link || null,
      dateMs,
      date:        pubDate
        ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null,
      duration,
    });
  }
  return episodes;
}

// ─── Fetch podcasts from Airtable ─────────────────────────────────────────────

async function fetchPodcastFeeds() {
  const params = new URLSearchParams();
  params.set('filterByFormula', `AND({Type} = "Podcast", {RSS Feed URL} != "")`);

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`Airtable ${res.status}`);
  const json = await res.json();
  return (json.records || []).map(r => ({
    name:    r.fields['Name'],
    rssUrl:  r.fields['RSS Feed URL'],
    imgUrl:  r.fields['Image URL'] || null,
  }));
}

// ─── Build episode index ───────────────────────────────────────────────────────

async function buildIndex() {
  const podcasts = await fetchPodcastFeeds();
  console.log(`[episodes-search] Building index from ${podcasts.length} podcast feeds`);

  const results = await Promise.allSettled(
    podcasts.map(async p => {
      const res = await fetch(p.rssUrl, {
        headers: { 'User-Agent': 'DentHub/1.0 (+https://denthub-one.vercel.app)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return parseAllEpisodes(xml, p.name, p.imgUrl);
    })
  );

  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  console.log(`[episodes-search] Indexed ${all.length} episodes from ${results.filter(r => r.status === 'fulfilled').length} feeds`);
  return all;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { q, max = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  // Rebuild index if cache is stale
  if (!episodeCache || Date.now() - episodeCacheTime > CACHE_TTL) {
    try {
      episodeCache     = await buildIndex();
      episodeCacheTime = Date.now();
    } catch (err) {
      console.error('[episodes-search] Index build failed:', err.message);
      return res.status(500).json({ error: 'Failed to load podcast feeds: ' + err.message });
    }
  }

  // Filter by query
  const terms = q.toLowerCase().trim().split(/\s+/);
  const maxN  = Math.min(parseInt(max, 10) || 20, 50);

  const matches = episodeCache
    .filter(ep => {
      const haystack = `${ep.title} ${ep.description} ${ep.podcast}`.toLowerCase();
      return terms.every(t => haystack.includes(t));
    })
    .sort((a, b) => b.dateMs - a.dateMs)
    .slice(0, maxN)
    .map(({ dateMs, ...rest }) => rest); // strip internal field

  console.log(`[episodes-search] "${q}" → ${matches.length} matches`);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ episodes: matches, count: matches.length, query: q });
}
