// YouTube channel helpers shared by /api/youtube-stats (all channels, cached
// 6 h) and the resource page (one channel, used when a newly added channel is
// not in that cached map yet). Dependency-free so it can be unit-tested
// (tests/youtube.test.js).

const UA = 'TheDentalCommute/1.0 (+https://thedentalcommute.com)';

// YouTube's RSS escapes characters in titles (&quot; &amp; &#39; …). React
// prints text as-is, so undecoded titles showed up as `&quot;Cheating&quot;`.
// ONE pass, so a title that really contains the text "&quot;" (stored as
// &amp;quot;) decodes to that text instead of being decoded twice.
const NAMED = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
export function decodeXmlEntities(s) {
  if (!s) return s;
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    const ch = NAMED[code.toLowerCase()];
    return ch === undefined ? whole : ch;
  });
}

// "12345" → "12K". Zero or missing → null, so the page hides the tile instead
// of printing "0 Subscribers" (YouTube reports a HIDDEN count as 0).
export function fmtCount(n) {
  const num = parseInt(n, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000)     return `${Math.round(num / 1_000)}K`;
  return num.toString();
}

// Channel id from a YouTube RSS feed URL (…/feeds/videos.xml?channel_id=UC…).
export function channelIdFromRss(rssUrl) {
  const m = rssUrl && rssUrl.match(/channel_id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// @handle or /channel/ID from a YouTube channel URL.
export function parseYouTubeUrl(url) {
  if (!url) return { handle: null, channelId: null };
  // @handle format — the only format YouTube's forHandle API accepts
  const handleMatch = url.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/);
  if (handleMatch) return { handle: handleMatch[1], channelId: null };
  // /channel/UCxxx — direct channel ID, best option
  const channelMatch = url.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (channelMatch) return { handle: null, channelId: channelMatch[1] };
  // /c/ and /user/ are legacy slugs — use as forHandle as a best-effort attempt
  // (works for some channels, not all — should migrate these URLs to @handle format)
  const legacyMatch = url.match(/youtube\.com\/(?:c\/|user\/)([A-Za-z0-9_.-]+)/);
  if (legacyMatch) return { handle: legacyMatch[1], channelId: null };
  return { handle: null, channelId: null };
}

export function rssUrlFor(channelId) {
  return channelId ? `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}` : null;
}

// Up to `limit` recent videos from a channel's RSS feed XML, newest first.
export function parseYouTubeRss(xml, limit = 9) {
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  const videos = [];
  let match;
  while ((match = entryRegex.exec(xml || '')) !== null && videos.length < limit) {
    const entry = match[1];
    const getText = (tag) => { const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null; };
    const getAt = (tag, attr) => { const m = entry.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, 'i')); return m ? m[1] : null; };
    const videoId   = getText('yt:videoId');
    const title     = decodeXmlEntities(getText('title'));
    const published = getText('published');
    const thumbnail = getAt('media:thumbnail', 'url');
    if (!videoId) continue;
    videos.push({
      videoId,
      title,
      url:         `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail:   thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      date:        published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      publishedAt: published || null,   // raw ISO — used by the scoring engine
    });
  }
  return videos;
}

// One channel's numbers from a YouTube API `channels` item.
// subscribersRaw is null (not 0) when the channel hides its count, so the
// scoring engine treats it as "unknown" instead of ranking it last.
export function channelStatsFromItem(item) {
  const st = item?.statistics || {};
  const hidden = st.hiddenSubscriberCount === true;
  const subs = hidden || st.subscriberCount == null ? null : parseInt(st.subscriberCount, 10);
  const vids = st.videoCount == null ? null : parseInt(st.videoCount, 10);
  return {
    avatar:         item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || null,
    subscribers:    hidden ? null : fmtCount(st.subscriberCount),
    videos:         fmtCount(st.videoCount),
    views:          fmtCount(st.viewCount),
    subscribersRaw: Number.isFinite(subs) ? subs : null,
    videosRaw:      Number.isFinite(vids) ? vids : null,
  };
}

export async function ytApi(path, key) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3${path}&key=${key}`, { signal: AbortSignal.timeout(10000) });
  return res.ok ? res.json() : { items: [] };
}

export async function fetchRecentVideos(rssUrl, limit = 9) {
  if (!rssUrl) return [];
  const res = await fetch(rssUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
  return res.ok ? parseYouTubeRss(await res.text(), limit) : [];
}

// Everything the resource page shows for ONE channel, fetched live — same
// shape as an entry of /api/youtube-stats. Used when a channel was added after
// that endpoint's 6-hour cache was built, so a new listing shows its videos at
// once. Never throws; returns null when nothing could be found.
// `fields` = the resource's Airtable-style fields (URL, RSS Feed URL).
export async function fetchChannel(fields, key = process.env.YOUTUBE_API_KEY) {
  try {
    const rssUrl = fields?.['RSS Feed URL'] || null;
    const { handle, channelId } = parseYouTubeUrl(fields?.URL);
    let ytId = channelIdFromRss(rssUrl) || channelId;
    if (!ytId && handle && key) {
      const d = await ytApi(`/channels?part=id&forHandle=${encodeURIComponent(handle)}`, key);
      ytId = d.items?.[0]?.id || null;
    }
    const [statsRes, videosRes] = await Promise.allSettled([
      ytId && key ? ytApi(`/channels?part=snippet,statistics&id=${ytId}`, key) : Promise.resolve(null),
      fetchRecentVideos(rssUrl || rssUrlFor(ytId)),
    ]);
    const item = statsRes.status === 'fulfilled' ? statsRes.value?.items?.[0] : null;
    const recentVideos = videosRes.status === 'fulfilled' ? videosRes.value : [];
    if (!item && !recentVideos.length) return null;
    return {
      ytId,
      ...(item ? channelStatsFromItem(item) : { avatar: null, subscribers: null, videos: null, subscribersRaw: null, videosRaw: null }),
      recentVideos,
      latest: recentVideos[0] || null,
    };
  } catch {
    return null;
  }
}
