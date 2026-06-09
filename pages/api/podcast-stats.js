// Fetches live podcast stats for all Podcast resources in Airtable.
// For each podcast with an RSS Feed URL, retrieves:
//   - Show artwork (itunes:image)
//   - Latest episode: title, date, audio URL, episode image
// Cached for 6 hours.

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

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
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '').replace(/\s+/g, ' ').trim();
}

function parsePodcastFeed(xml) {
  // Show-level artwork
  const showArt = getAttr(xml, 'itunes:image', 'href') || null;

  // Parse up to 5 episodes
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const episodes = [];
  let match;
  while ((match = itemRegex.exec(xml)) !== null && episodes.length < 4) {
    const item = match[1];
    const title       = stripHtml(getTag(item, 'title'));
    const pubDate     = getTag(item, 'pubDate');
    const audioUrl    = getAttr(item, 'enclosure', 'url');
    const link        = getTag(item, 'link');
    const episodeArt  = getAttr(item, 'itunes:image', 'href') || showArt;
    const description = stripHtml(getTag(item, 'description') || getTag(item, 'itunes:summary') || '');
    episodes.push({
      title:       title || 'New episode',
      date:        pubDate ? new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      audioUrl:    audioUrl || link || null,
      image:       episodeArt,
      description: description.slice(0, 160),
    });
  }

  return {
    showArt,
    episodes,
    latest: episodes[0] || null,
  };
}

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  if (!AIRTABLE_PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  // 1. Fetch all Podcast records that have an RSS Feed URL
  const params = new URLSearchParams();
  params.set('filterByFormula', `AND({Type} = "Podcast", {RSS Feed URL} != "")`);
  const atRes = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!atRes.ok) return res.status(500).json({ error: `Airtable ${atRes.status}` });
  const atJson  = await atRes.json();
  const records = atJson.records || [];

  // 2. Fetch each RSS feed in parallel
  const feedResults = await Promise.allSettled(
    records.map(r => {
      const rssUrl = r.fields['RSS Feed URL'];
      return fetch(rssUrl, {
        headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
        signal: AbortSignal.timeout(8000),
      })
        .then(res => res.ok ? res.text() : null)
        .then(xml => xml ? parsePodcastFeed(xml) : null);
    })
  );

  // 3. Build result map keyed by Airtable record ID
  const result = {};
  records.forEach((r, i) => {
    const data = feedResults[i].status === 'fulfilled' ? feedResults[i].value : null;
    if (data) {
      result[r.id] = {
        showArt:  data.showArt  || null,
        episodes: data.episodes || [],
        latest:   data.latest   || null,
      };
    }
  });

  cache     = result;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(result);
}
