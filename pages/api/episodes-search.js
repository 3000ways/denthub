// Searches podcast episodes across all indexed podcasts using PodcastIndex.org API.
// Auth uses HMAC-SHA1: hash of (apiKey + apiSecret + unixTimestamp)

import crypto from 'crypto';

const PI_KEY    = process.env.PODCAST_INDEX_KEY;
const PI_SECRET = process.env.PODCAST_INDEX_SECRET;

function makeHeaders() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hash = crypto
    .createHash('sha1')
    .update(PI_KEY + PI_SECRET + timestamp)
    .digest('hex');
  return {
    'X-Auth-Key':    PI_KEY,
    'X-Auth-Date':   timestamp,
    'Authorization': hash,
    'User-Agent':    'DentHub/1.0 (+https://denthub-one.vercel.app)',
  };
}

export default async function handler(req, res) {
  if (!PI_KEY || !PI_SECRET) {
    console.error('[episodes-search] Missing credentials. KEY:', !!PI_KEY, 'SECRET:', !!PI_SECRET);
    return res.status(500).json({ error: 'PodcastIndex credentials not configured' });
  }

  const { q, max = 20 } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(q + ' dentistry dental')}&max=${max}&pretty`;

    // First get matching podcasts, then get their recent episodes matching the term
    const [episodeRes] = await Promise.all([
      fetch(
        `https://api.podcastindex.org/api/1.0/episodes/search?q=${encodeURIComponent(q)}&max=${max}&pretty`,
        { headers: makeHeaders(), signal: AbortSignal.timeout(10000) }
      )
    ]);

    console.log('[episodes-search] PodcastIndex status:', episodeRes.status);
    if (!episodeRes.ok) {
      const body = await episodeRes.text();
      console.error('[episodes-search] PodcastIndex error body:', body.slice(0, 500));
      throw new Error(`PodcastIndex returned ${episodeRes.status}: ${body.slice(0,200)}`);
    }

    const data = await episodeRes.json();
    console.log('[episodes-search] items returned:', data.items?.length ?? 0);
    const items = (data.items || []).map(ep => ({
      id:          ep.id,
      title:       ep.title,
      podcast:     ep.feedTitle,
      date:        ep.datePublished
        ? new Date(ep.datePublished * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null,
      description: ep.description
        ? ep.description.replace(/<[^>]+>/g, '').slice(0, 220)
        : null,
      image:       ep.image || ep.feedImage || null,
      url:         ep.link || null,
      audioUrl:    ep.enclosureUrl || null,
      duration:    ep.duration ? formatDuration(ep.duration) : null,
    }));

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ episodes: items, count: items.length, query: q });
  } catch (err) {
    console.error('[episodes-search] caught error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
