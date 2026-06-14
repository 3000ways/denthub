import { isAdminAuthenticated } from '../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const result = {
    url,
    type: 'Website',
    name: '',
    description: '',
    youtubeChannelId: '',
    podcastFeedUrl: '',
  };

  try {
    const u = new URL(url);

    // Detect YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      result.type = 'YouTube Channel';
      // Extract channel info from URL patterns
      const channelMatch = u.pathname.match(/\/@([^/]+)|\/channel\/([^/]+)|\/c\/([^/]+)|\/user\/([^/]+)/);
      if (channelMatch) {
        const handle = channelMatch[1] || channelMatch[2] || channelMatch[3] || channelMatch[4];
        result.name = handle ? `@${handle}` : '';
      }
    }

    // Detect podcast platforms
    else if (
      u.hostname.includes('podcasts.apple.com') ||
      u.hostname.includes('open.spotify.com') ||
      u.hostname.includes('podcasts.google.com') ||
      u.hostname.includes('anchor.fm') ||
      u.hostname.includes('buzzsprout.com') ||
      u.hostname.includes('podbean.com') ||
      u.hostname.includes('libsyn.com') ||
      u.hostname.includes('simplecast.com') ||
      u.hostname.includes('transistor.fm')
    ) {
      result.type = 'Podcast';
    }

    // Try to fetch page title for all types
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DentalCommute/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
      const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

      if (!result.name) {
        result.name = (ogTitleMatch?.[1] || titleMatch?.[1] || '').trim().replace(/\s*[-|].*$/, '').trim();
      }
      result.description = (ogDescMatch?.[1] || descMatch?.[1] || '').trim().slice(0, 300);
    } catch (fetchErr) {
      // page fetch failed — still return type detection
    }

  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  res.status(200).json(result);
}
