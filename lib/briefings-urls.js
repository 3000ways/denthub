// Journal Briefings — public URLs and the show blurb. Dependency-free so the
// feed builder (and its tests) can import it without touching Supabase.
export const SITE = 'https://thedentalcommute.com';
export const artworkPath = cluster => `/podcast/${cluster}.png`;          // for <img> on our own pages
export const artworkUrl = cluster => `${SITE}${artworkPath(cluster)}`;      // for feeds, OG tags, the player
export const feedUrl = cluster => `${SITE}/api/podcast/${cluster}.xml`;
export const showUrl = cluster => `${SITE}/journals/${cluster}`;
export const briefingUrl = id => `${SITE}/briefing/${id}`;
export const chaptersUrl = audioUrl => String(audioUrl || '').replace(/\.mp3(\?.*)?$/, '.chapters.json');

// Plain-English description of a show (feed, hub, resource row).
export function showDescription(c) {
  const js = c.journals.map(j => j.name);
  const list = js.length > 1 ? `${js.slice(0, -1).join(', ')} and ${js[js.length - 1]}` : js[0];
  return `Every Monday, the week's new research in ${c.label.toLowerCase()} from ${list}. Each paper is summarised in our own words with the authors' conclusion quoted; open-access abstracts are read as published. Narrated by AI voices, and we say so. Independently produced by The Dental Commute; not affiliated with any journal or publisher.`;
}
