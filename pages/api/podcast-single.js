const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
const AIRTABLE_PAT  = process.env.AIRTABLE_PAT;

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

function parseFeed(xml) {
  const showArt = getAttr(xml, 'itunes:image', 'href') || null;
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const episodes = [];
  let match;
  while ((match = itemRegex.exec(xml)) !== null && episodes.length < 30) {
    const item = match[1];
    const title       = stripHtml(getTag(item, 'title'));
    const pubDate     = getTag(item, 'pubDate');
    const audioUrl    = getAttr(item, 'enclosure', 'url');
    const link        = getTag(item, 'link');
    const episodeArt  = getAttr(item, 'itunes:image', 'href') || showArt;
    const description = stripHtml(getTag(item, 'description') || getTag(item, 'itunes:summary') || '');
    const parsedDate  = pubDate ? new Date(pubDate) : null;
    episodes.push({
      title:       title || 'Episode',
      date:        parsedDate ? parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      timestamp:   parsedDate ? parsedDate.getTime() : 0,
      audioUrl:    audioUrl || link || null,
      image:       episodeArt,
      description: description.slice(0, 200),
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
  const recRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Resources/${id}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  if (!recRes.ok) return res.status(404).json({ error: 'Not found' });
  const record = await recRes.json();
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
