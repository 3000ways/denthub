// Shared "is this the same resource?" keys, used by the Research agent (to avoid
// inserting duplicates) and the admin Duplicates finder (to surface existing ones).
// Pure functions — no I/O.

// URL → comparable key: no scheme, no "www.", no #fragment, no tracking params,
// no trailing slash, lowercase. So http://www.x.com/show/ and https://x.com/show
// collide (the Research agent's old key kept "www", so they didn't).
export function normalizeUrl(url) {
  if (!url) return '';
  try {
    let u = url.trim().toLowerCase();
    u = u.replace(/^https?:\/\//, '');
    u = u.replace(/^www\./, '');
    u = u.split('#')[0];
    const qIdx = u.indexOf('?');
    if (qIdx !== -1) {
      const base = u.slice(0, qIdx);
      const rawParams = u.slice(qIdx + 1);
      const keep = [];
      for (const pair of rawParams.split('&')) {
        const [k] = pair.split('=');
        if (k && !k.startsWith('utm_') && !['ref', 'source', 'fbclid', 'gclid'].includes(k)) {
          keep.push(pair);
        }
      }
      u = keep.length > 0 ? `${base}?${keep.join('&')}` : base;
    }
    return u.replace(/\/+$/, '');
  } catch {
    return url.toLowerCase().trim();
  }
}

// Name → comparable key: lowercase, "&"→"and", punctuation dropped, leading
// "The", and trailing format words ("Podcast", "Show", "Channel"…) stripped.
// "The Savvy Dentist Podcast" and "Savvy Dentist" → "savvy dentist".
// Callers should compare within the same Type — "ACT Dental" the podcast and
// "ACT Dental" the coaching program are different resources.
const TRAILING_FORMAT_WORDS = /(\s+(podcast|podcasts|show|channel|official|youtube|the))+$/;

export function normalizeName(name) {
  if (!name) return '';
  const key = name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the\s+/, '')
    .replace(TRAILING_FORMAT_WORDS, '')
    .trim();
  // Never reduce a name to nothing (e.g. a show literally called "The Podcast").
  return key || name.toLowerCase().trim();
}
