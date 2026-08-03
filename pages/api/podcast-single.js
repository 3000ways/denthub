import { getPublishedResource } from '../../lib/resources-db';

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
  return (str || '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,'').replace(/&[a-z]+;/g,'').replace(/\s+/g,' ').trim();
}

function parseDuration(str) {
  if (!str) return null;
  const parts = str.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
  return null;
}

function parseFeed(xml) {
  const showArt = getAttr(xml, 'itunes:image', 'href') || null;
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const episodes = [];
  let match;
  while ((match = itemRegex.exec(xml)) !== null && episodes.length < 30) {
    const item = match[1];
    const title           = stripHtml(getTag(item, 'title'));
    const pubDate         = getTag(item, 'pubDate');
    const audioUrl        = getAttr(item, 'enclosure', 'url');
    const link            = getTag(item, 'link');
    const episodeArt      = getAttr(item, 'itunes:image', 'href') || showArt;
    const description     = stripHtml(getTag(item, 'description') || getTag(item, 'itunes:summary') || '');
    const guid            = stripHtml(getTag(item, 'guid')) || audioUrl;
    const durationRaw     = getTag(item, 'itunes:duration');
    const durationSeconds = parseDuration(durationRaw);
    const parsedDate      = pubDate ? new Date(pubDate) : null;
    episodes.push({
      title:           title || 'Episode',
      date:            parsedDate ? parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      publishedAt:     parsedDate ? parsedDate.toISOString() : null,
      timestamp:       parsedDate ? parsedDate.getTime() : 0,
      audioUrl:        audioUrl || link || null,
      link:            link || null,
      image:           episodeArt,
      description:     description.slice(0, 200),
      guid:            guid || null,
      durationSeconds: durationSeconds,
    });
  }
  return { showArt, episodes };
}

const cache = {};
const CACHE_TTL = 6 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (cache[id] && Date.now() - cache[id].time < CACHE_TTL) {
    return res.status(200).json(cache[id].data);
  }

  // Fetch the record to get the RSS URL
  const record = await getPublishedResource(id, { select: 'id, rss_feed_url' });
  if (!record) return res.status(404).json({ error: 'Not found' });
  const rssUrl = record.fields?.['RSS Feed URL'];
  if (!rssUrl) return res.status(200).json({ showArt: null, recent: [], notable: [] });

  // Fetch RSS
  const feedRes = await fetch(rssUrl, {
    headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!feedRes.ok) return res.status(200).json({ showArt: null, recent: [], notable: [] });
  const xml = await feedRes.text();
  const { showArt, episodes } = parseFeed(xml);

  const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
  const recent  = episodes.slice(0, 5);
  const notable = episodes.filter(e => e.timestamp > 0 && e.timestamp < sixMonthsAgo).slice(0, 5);

  const data = { showArt, recent, notable };
  cache[id] = { data, time: Date.now() };

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  return res.status(200).json(data);
}
