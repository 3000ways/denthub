// Journal Briefings — public URLs and the show blurb. Dependency-free so the
// feed builder (and its tests) can import it without touching Supabase.
export const SITE = 'https://thedentalcommute.com';
export const artworkPath = cluster => `/podcast/${cluster}.png`;          // for <img> on our own pages
export const artworkUrl = cluster => `${SITE}${artworkPath(cluster)}`;      // for feeds, OG tags, the player
export const feedUrl = cluster => `${SITE}/api/podcast/${cluster}.xml`;
export const showUrl = cluster => `${SITE}/journals/${cluster}`;
export const briefingUrl = id => `${SITE}/briefing/${id}`;
export const policyUrl = `${SITE}/journals/policy`;
export const chaptersUrl = audioUrl => String(audioUrl || '').replace(/\.mp3(\?.*)?$/, '.chapters.json');

// Download counting for podcast apps (added 2026-11-25). The feed's enclosure
// URLs go through OP3 (op3.dev, the free, open-source Open Podcast Prefix
// Project): the app asks op3.dev, OP3 logs the request (IP stored hashed only)
// and redirects to our MP3 in Supabase storage. Format from op3.dev/setup:
//   https://op3.dev/e,pg=<podcast guid>/<url without "https://">
// `pg` links the downloads to the show faster. An http:// target keeps its
// scheme. Already-prefixed URLs are left alone. Only the FEED uses this; the
// site's own player plays the file directly (site plays are counted in GA4).
export const OP3_PREFIX = 'https://op3.dev/e';
export function trackedAudioUrl(url, podcastGuid) {
  const s = String(url || '');
  if (!s || s.startsWith('https://op3.dev/')) return s;
  const target = s.startsWith('https://') ? s.slice('https://'.length) : s;
  const pg = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(podcastGuid || '')) ? `,pg=${podcastGuid}` : '';
  return `${OP3_PREFIX}${pg}/${target}`;
}

// Plain-English description of a show (feed, hub, resource row).
export function showDescription(c) {
  const js = c.journals.map(j => j.name);
  const list = js.length > 1 ? `${js.slice(0, -1).join(', ')} and ${js[js.length - 1]}` : js[0];
  return `Every Monday, the week's new research in ${c.label.toLowerCase()} from ${list}. Each paper is summarised in our own words with the authors' conclusion quoted; open-access abstracts are read as published. Narrated by AI voices, and we say so. Independently produced by The Dental Commute; not affiliated with any journal or publisher.`;
}
