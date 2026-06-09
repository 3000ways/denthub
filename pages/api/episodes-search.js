// Episode search using PodcastIndex.org
// Step 1: search for dental podcasts matching the query term
// Step 2: fetch recent episodes from those podcasts
// Step 3: filter episodes whose title/description contains the query

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
    'User-Agent':    'TheDentalCommute/1.0 (+https://thedentalcommute.com)',
  };
}

async function piGet(path) {
  const res = await fetch(`https://api.podcastindex.org/api/1.0${path}`, {
    headers: makeHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PodcastIndex ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default async function handler(req, res) {
  if (!PI_KEY || !PI_SECRET) {
    return res.status(500).json({ error: 'PodcastIndex credentials not configured' });
  }

  const { q, max = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const maxN   = Math.min(parseInt(max, 10) || 20, 50);
  const terms  = q.toLowerCase().trim().split(/\s+/);

  try {
    // Step 1: Find dental podcasts matching the query
    const searchQuery = encodeURIComponent(`dental ${q}`);
    const feedData = await piGet(`/search/byterm?q=${searchQuery}&max=10&fulltext`);
    const feeds = (feedData.feeds || []).slice(0, 8); // top 8 matching podcasts

    if (feeds.length === 0) {
      return res.status(200).json({ episodes: [], count: 0, query: q });
    }

    // Step 2: Fetch recent episodes from each matching podcast in parallel
    const episodeBatches = await Promise.allSettled(
      feeds.map(feed =>
        piGet(`/episodes/byfeedid?id=${feed.id}&max=20&fulltext`)
          .then(d => (d.items || []).map(ep => ({ ...ep, _feedTitle: feed.title, _feedImage: feed.image })))
      )
    );

    const allEpisodes = episodeBatches
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Step 3: Filter by the original query term (not "dental")
    const matched = allEpisodes
      .filter(ep => {
        const haystack = `${ep.title || ''} ${ep.description || ''}`.toLowerCase();
        return terms.every(t => haystack.includes(t));
      })
      .sort((a, b) => (b.datePublished || 0) - (a.datePublished || 0))
      .slice(0, maxN)
      .map(ep => ({
        id:          ep.id,
        title:       ep.title,
        podcast:     ep._feedTitle || ep.feedTitle,
        date:        ep.datePublished
          ? new Date(ep.datePublished * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null,
        description: ep.description
          ? ep.description.replace(/<[^>]+>/g, '').slice(0, 220)
          : null,
        image:       ep.image || ep._feedImage || ep.feedImage || null,
        url:         ep.link || null,
        audioUrl:    ep.enclosureUrl || null,
        duration:    formatDuration(ep.duration),
      }));

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ episodes: matched, count: matched.length, query: q });

  } catch (err) {
    console.error('[episodes-search] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
