// Fetches live YouTube channel stats for all YouTube resources in Airtable.
// Resolves channel IDs from either:
//   - RSS Feed URL field (existing channels): extracts channel_id= param
//   - YouTube URL field (@handle or /channel/ URL): looks up via YouTube API
// Cached for 6 hours.

import { listPublishedResources } from '../../lib/resources-db';
import { setCdnCache } from '../../lib/cdn-cache';
import { channelIdFromRss, parseYouTubeUrl, channelStatsFromItem, fetchRecentVideos, rssUrlFor, ytApi } from '../../lib/youtube';
const YT_KEY         = process.env.YOUTUBE_API_KEY;

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000;

const ytGet = (path) => ytApi(path, YT_KEY);

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    setCdnCache(res, 21600, { ageMs: Date.now() - cacheTime });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  if (!YT_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' });

  // 1. Fetch all published YouTube channels
  let records;
  try {
    records = await listPublishedResources({ type: 'YouTube', select: 'id, name, url, rss_feed_url' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

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
      const data = await ytGet(`/channels?part=id&forHandle=${encodeURIComponent(c.handle)}`);
      if (data.items?.[0]?.id) c.ytId = data.items[0].id;
    })
  );

  // 4. Batch fetch stats for all resolved channels (50 at a time)
  const withIds = channels.filter(c => c.ytId);
  const ytMap   = {};
  for (let i = 0; i < withIds.length; i += 50) {
    const batch = withIds.slice(i, i + 50);
    const ids   = batch.map(c => c.ytId).join(',');
    const data  = await ytGet(`/channels?part=snippet,statistics&id=${ids}`);
    for (const item of (data.items || [])) {
      // Display strings + raw numbers for the scoring engine. A hidden
      // subscriber count comes back as null, never as a fake 0.
      ytMap[item.id] = channelStatsFromItem(item);
    }
  }

  // 5. Fetch latest video from each channel's RSS feed
  //    Build RSS URL from known ytId if rssUrl is missing
  const rssResults = await Promise.allSettled(
    channels.map(c => {
      const rss = c.rssUrl || rssUrlFor(c.ytId);
      return rss ? fetchRecentVideos(rss) : Promise.resolve(null);
    })
  );

  // 6. Build result map keyed by Airtable record ID
  const result = {};
  channels.forEach((c, i) => {
    const yt          = ytMap[c.ytId] || {};
    const recentVids  = rssResults[i].status === 'fulfilled' ? (rssResults[i].value || []) : [];
    result[c.id] = {
      ytId:        c.ytId,
      avatar:      yt.avatar       || null,
      subscribers: yt.subscribers  || null,
      videos:      yt.videos       || null,
      subscribersRaw: yt.subscribersRaw ?? null,
      videosRaw:      yt.videosRaw ?? null,
      recentVideos: recentVids,
      latest:      recentVids[0]   || null,
    };
  });

  cache     = result;
  cacheTime = Date.now();

  setCdnCache(res, 21600);
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(result);
}
