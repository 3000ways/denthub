// Fetches live YouTube channel stats for all YouTube resources in Airtable.
// Uses the YouTube Data API v3 for subscriber counts, video counts, and avatars.
// Also pulls the latest video from each channel's RSS feed.
// Cached for 6 hours.

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;
const YT_KEY         = process.env.YOUTUBE_API_KEY;

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

function fmtCount(n) {
  if (!n) return null;
  const num = parseInt(n, 10);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000)     return `${Math.round(num / 1_000)}K`;
  return num.toString();
}

// Extract channel ID from YouTube RSS feed URL
function channelIdFromRss(rssUrl) {
  const m = rssUrl && rssUrl.match(/channel_id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// Parse latest video from YouTube RSS feed XML
function parseLatestVideo(xml) {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry  = entryMatch[1];
  const getId  = (tag) => { const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null; };
  const getAt  = (tag, attr) => { const m = entry.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i')); return m ? m[1] : null; };
  const videoId   = getId('yt:videoId');
  const title     = getId('title');
  const published = getId('published');
  const thumbnail = getAt('media:thumbnail', 'url');
  return {
    videoId,
    title,
    url:       videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    thumbnail: thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null),
    date:      published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
  };
}

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  if (!AIRTABLE_PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });
  if (!YT_KEY)       return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' });

  // 1. Fetch YouTube channels from Airtable
  const params = new URLSearchParams();
  params.set('filterByFormula', `{Type} = "YouTube"`);
  const atRes = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!atRes.ok) return res.status(500).json({ error: `Airtable ${atRes.status}` });
  const atJson = await atRes.json();
  const records = (atJson.records || []).filter(r => r.fields['RSS Feed URL']);

  // 2. Extract channel IDs
  const channels = records.map(r => ({
    id:      r.id,
    name:    r.fields['Name'],
    rssUrl:  r.fields['RSS Feed URL'],
    url:     r.fields['URL'],
    ytId:    channelIdFromRss(r.fields['RSS Feed URL']),
  })).filter(c => c.ytId);

  if (channels.length === 0) return res.status(200).json({});

  // 3. Batch fetch YouTube API stats (up to 50 at once)
  const ytIds = channels.map(c => c.ytId).join(',');
  const ytRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ytIds}&key=${YT_KEY}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const ytJson = ytRes.ok ? await ytRes.json() : { items: [] };
  const ytMap  = {};
  for (const item of (ytJson.items || [])) {
    ytMap[item.id] = {
      avatar:      item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
      subscribers: fmtCount(item.statistics?.subscriberCount),
      videos:      fmtCount(item.statistics?.videoCount),
      views:       fmtCount(item.statistics?.viewCount),
      description: item.snippet?.description?.slice(0, 200) || null,
    };
  }

  // 4. Fetch latest video from each RSS feed in parallel
  const rssResults = await Promise.allSettled(
    channels.map(c =>
      fetch(c.rssUrl, {
        headers: { 'User-Agent': 'DentHub/1.0 (+https://denthub-one.vercel.app)' },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.ok ? r.text() : null).then(xml => xml ? parseLatestVideo(xml) : null)
    )
  );

  // 5. Build result map keyed by Airtable record ID
  const result = {};
  channels.forEach((c, i) => {
    const yt     = ytMap[c.ytId] || {};
    const latest = rssResults[i].status === 'fulfilled' ? rssResults[i].value : null;
    result[c.id] = {
      ytId:        c.ytId,
      avatar:      yt.avatar,
      subscribers: yt.subscribers,
      videos:      yt.videos,
      views:       yt.views,
      latest,
    };
  });

  cache     = result;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(result);
}
