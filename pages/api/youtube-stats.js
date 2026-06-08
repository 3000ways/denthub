// Fetches live YouTube channel stats for all YouTube resources in Airtable.
// Resolves channel IDs from either:
//   - RSS Feed URL field (existing channels): extracts channel_id= param
//   - YouTube URL field (@handle or /channel/ URL): looks up via YouTube API
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

// Extract @handle or /channel/ID from a YouTube URL
function parseYouTubeUrl(url) {
  if (!url) return { handle: null, channelId: null };
  const handleMatch = url.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/);
  if (handleMatch) return { handle: handleMatch[1], channelId: null };
  const channelMatch = url.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (channelMatch) return { handle: null, channelId: channelMatch[1] };
  const userMatch = url.match(/youtube\.com\/(?:c\/|user\/)([A-Za-z0-9_.-]+)/);
  if (userMatch) return { handle: userMatch[1], channelId: null };
  return { handle: null, channelId: null };
}

// Parse latest video from YouTube RSS feed XML
function parseLatestVideo(xml) {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry = entryMatch[1];
  const getId = (tag) => { const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null; };
  const getAt = (tag, attr) => { const m = entry.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i')); return m ? m[1] : null; };
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

async function ytGet(path) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3${path}`, { signal: AbortSignal.timeout(10000) });
  return res.ok ? res.json() : { items: [] };
}

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  if (!AIRTABLE_PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });
  if (!YT_KEY)       return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' });

  // 1. Fetch all YouTube channels from Airtable
  const params = new URLSearchParams();
  params.set('filterByFormula', `{Type} = "YouTube"`);
  const atRes = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!atRes.ok) return res.status(500).json({ error: `Airtable ${atRes.status}` });
  const atJson  = await atRes.json();
  const records = atJson.records || [];

  // 2. Build channel list — resolve IDs from RSS URL or YouTube URL
  const channels = records.map(r => {
    const rssUrl = r.fields['RSS Feed URL'];
    const ytUrl  = r.fields['URL'];
    const ytId   = channelIdFromRss(rssUrl);
    const { handle, channelId } = parseYouTubeUrl(ytUrl);
    return {
      id:       r.id,
      name:     r.fields['Name'],
      ytId,           // already known (from RSS URL)
      handle,         // @handle to resolve
      channelId,      // /channel/ID direct
      rssUrl,
    };
  });

  // 3. Resolve handles → channel IDs via YouTube API (batch by 50)
  const needResolve = channels.filter(c => !c.ytId && (c.handle || c.channelId));

  // Resolve /channel/ID ones directly (already have IDs)
  needResolve.filter(c => c.channelId).forEach(c => { c.ytId = c.channelId; });

  // Resolve @handles via YouTube API — one request per handle (no batch endpoint for handles)
  const handleChannels = needResolve.filter(c => !c.ytId && c.handle);
  await Promise.allSettled(
    handleChannels.map(async c => {
      const data = await ytGet(`/channels?part=id&forHandle=${encodeURIComponent(c.handle)}&key=${YT_KEY}`);
      if (data.items?.[0]?.id) c.ytId = data.items[0].id;
    })
  );

  // 4. Batch fetch stats for all resolved channels (50 at a time)
  const withIds = channels.filter(c => c.ytId);
  const ytMap   = {};
  for (let i = 0; i < withIds.length; i += 50) {
    const batch = withIds.slice(i, i + 50);
    const ids   = batch.map(c => c.ytId).join(',');
    const data  = await ytGet(`/channels?part=snippet,statistics&id=${ids}&key=${YT_KEY}`);
    for (const item of (data.items || [])) {
      ytMap[item.id] = {
        avatar:      item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
        subscribers: fmtCount(item.statistics?.subscriberCount),
        videos:      fmtCount(item.statistics?.videoCount),
        views:       fmtCount(item.statistics?.viewCount),
      };
    }
  }

  // 5. Fetch latest video from each channel's RSS feed
  //    Build RSS URL from known ytId if rssUrl is missing
  const rssResults = await Promise.allSettled(
    channels.map(c => {
      const rss = c.rssUrl || (c.ytId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${c.ytId}` : null);
      if (!rss) return Promise.resolve(null);
      return fetch(rss, {
        headers: { 'User-Agent': 'DentHub/1.0 (+https://denthub-one.vercel.app)' },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.ok ? r.text() : null).then(xml => xml ? parseLatestVideo(xml) : null);
    })
  );

  // 6. Build result map keyed by Airtable record ID
  const result = {};
  channels.forEach((c, i) => {
    const yt     = ytMap[c.ytId] || {};
    const latest = rssResults[i].status === 'fulfilled' ? rssResults[i].value : null;
    result[c.id] = {
      ytId:        c.ytId,
      avatar:      yt.avatar   || null,
      subscribers: yt.subscribers || null,
      videos:      yt.videos   || null,
      latest,
    };
  });

  cache     = result;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(result);
}
