// The resource-image ladder, in one place. Every listing image on the site walks
// this list and moves down a rung when one fails to load (see use-image-ladder.js):
//
//   anything the page already knows is better (owner logo, live show art)
//   → human "Image URL" → machine "Auto Image URL" → page-supplied extras
//   → YouTube avatar / Open Library cover → favicon → letter tile or placeholder
//
// This only decides what the browser TRIES. It never writes to the database, so
// a dead human-set image stays stored (and editable) but is simply skipped.

const FAVICON_PREFIX = '/api/airtable?logo=';

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

export function faviconSrc(url) {
  const domain = url ? getDomain(url) : null;
  return domain ? `${FAVICON_PREFIX}${domain}` : null;
}

export function isFaviconSrc(src) {
  return !!src && src.startsWith(FAVICON_PREFIX);
}

// default=false makes Open Library answer 404 when it has no cover. Without it,
// it sends a blank 1x1 image that looks like a success.
export function openLibraryCoverSrc(title) {
  if (!title) return null;
  return `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-M.jpg?default=false`;
}

export function youtubeThumbSrc(url) {
  if (!url || !/^https?:\/\/(www\.)?youtube\.com\//i.test(url)) return null;
  return `/api/youtube-thumb?url=${encodeURIComponent(url)}`;
}

// `before` = images that outrank the stored ones on this page (owner logo, live
// show art). `after` = page-supplied extras tried below the stored ones.
export function resourceImages(fields, { before = [], after = [], favicon = true } = {}) {
  const f = fields || {};
  const list = [
    ...before,
    f['Image URL'],
    f['Auto Image URL'],
    ...after,
    f.Type === 'Book' ? openLibraryCoverSrc(f.Name) : null,
    youtubeThumbSrc(f.URL),
    favicon ? faviconSrc(f.URL) : null,
  ];
  return [...new Set(list.filter(Boolean))];
}

// Book-shaped cards: a site favicon stretched over a cover looks wrong, so these
// go straight from the last real cover to the 📚 placeholder.
export function bookCoverImages(fields) {
  return resourceImages(fields, { favicon: false });
}
