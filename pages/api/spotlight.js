// Fetches the latest episode from curated podcast RSS feeds and YouTube channels.
// Results are cached for 6 hours to avoid hammering the feeds on every page load.

const PODCAST_FEEDS = [
  { show: 'The Dental Hacks Podcast',       feedUrl: 'https://dentalhacks.libsyn.com/rss',       siteUrl: 'https://dentalhacks.com/' },
  { show: 'Dentistry Uncensored',            feedUrl: 'https://rss.libsyn.com/shows/58519/destinations/222357.xml', siteUrl: 'https://www.dentaltown.com/channel/54/dentistry-uncensored-with-howard-farran' },
  { show: 'Everyday Practices',              feedUrl: 'https://everydaypractices.libsyn.com/rss', siteUrl: 'https://productivedentist.com/podcasts/everyday-practices-dental-podcast/' },
  { show: 'The Dental Marketer',             feedUrl: 'https://thedentalmarketer.site/index.php/feed/podcast', siteUrl: 'https://thedentalmarketer.site/' },
  { show: 'The Dentalpreneur',               feedUrl: 'https://markcostes.libsyn.com/rss',        siteUrl: 'https://www.truedentalsuccess.com/the-dentalpreneur-podcast/' },
];

const YOUTUBE_CHANNELS = [
  { show: 'ADA',                channelId: 'UC3UBF_16dd2UncCoR0lCgKQ' },
  { show: 'Spear Education',    channelId: 'UCaVv1J5y4_aI73G0366qC-g' },
  { show: 'Dentistry Uncensored (YouTube)', channelId: 'UCxpTLZhizevXl-vQ6ODEd0A' },
];

// Simple XML text extraction — no external dependencies needed.
function getTag(xml, tag) {
  // handles <tag>content</tag> and <ns:tag>content</ns:tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
}

function getAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function parsePodcastFeed(xml, meta) {
  // Channel-level artwork
  const showArt = getAttr(xml, 'itunes:image', 'href') || null;

  // Find first <item>
  const itemMatch = xml.match(/<item[\s>]([\s\S]*?)<\/item>/i);
  if (!itemMatch) return null;
  const item = itemMatch[1];

  const title       = getTag(item, 'title');
  const link        = getTag(item, 'link') || meta.siteUrl;
  const pubDate     = getTag(item, 'pubDate');
  const description = getTag(item, 'description') || getTag(item, 'itunes:summary') || '';
  const episodeArt  = getAttr(item, 'itunes:image', 'href') || showArt;
  const enclosureUrl = getAttr(item, 'enclosure', 'url');

  // Strip HTML tags from description
  const cleanDesc = description.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,'').trim().slice(0, 200);

  return {
    type:        'podcast',
    show:        meta.show,
    title:       title || 'New episode',
    url:         enclosureUrl || link,
    siteUrl:     meta.siteUrl,
    image:       episodeArt,
    date:        pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    description: cleanDesc,
  };
}

function parseYouTubeFeed(xml, meta) {
  // YouTube Atom feed — entries look like <entry>...</entry>
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry = entryMatch[1];

  const videoId    = getTag(entry, 'yt:videoId');
  const title      = getTag(entry, 'title');
  const published  = getTag(entry, 'published');
  const description = getTag(entry, 'media:description') || '';
  const thumbnail  = getAttr(entry, 'media:thumbnail', 'url');

  const cleanDesc = description.replace(/<[^>]+>/g, '').trim().slice(0, 200);

  return {
    type:        'video',
    show:        meta.show,
    title:       title || 'New video',
    url:         videoId ? `https://www.youtube.com/watch?v=${videoId}` : `https://www.youtube.com/channel/${meta.channelId}`,
    image:       thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null),
    date:        published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    description: cleanDesc,
  };
}

// Simple in-memory cache (resets on cold start, good enough for serverless warm instances)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DentHub/1.0 (+https://denthub-one.vercel.app)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export default async function handler(req, res) {
  // Serve cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  // Fetch all feeds in parallel; failed ones return null (don't crash the whole page)
  const [podcastResults, videoResults] = await Promise.all([
    Promise.all(
      PODCAST_FEEDS.map(meta =>
        fetchFeed(meta.feedUrl)
          .then(xml => parsePodcastFeed(xml, meta))
          .catch(() => null)
      )
    ),
    Promise.all(
      YOUTUBE_CHANNELS.map(meta =>
        fetchFeed(`https://www.youtube.com/feeds/videos.xml?channel_id=${meta.channelId}`)
          .then(xml => parseYouTubeFeed(xml, meta))
          .catch(() => null)
      )
    ),
  ]);

  const data = {
    podcasts: podcastResults.filter(Boolean),
    videos:   videoResults.filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };

  cache = data;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  res.status(200).json(data);
}
