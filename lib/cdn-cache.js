// Tell Vercel's CDN to keep a shared copy of a public API response.
//
// Several routes keep an in-memory cache, but that only lives on one warm
// function instance. If the in-memory HIT path sends no Cache-Control, the CDN
// can't store the response, so every visitor reaches a function — and when that
// function is cold, the next visitor pays for a full rebuild (e.g. a live sweep
// of every RSS feed). Call this on EVERY success path, HIT and MISS alike.
//
// `ageMs` (optional) is how old the in-memory copy already is, so a HIT doesn't
// restart the full freshness window. The long stale-while-revalidate window means
// that after it expires the CDN still answers instantly with the old copy while it
// refreshes in the background — visitors never wait on the rebuild.
const WEEK = 7 * 24 * 60 * 60;

export function setCdnCache(res, maxAgeSec, { ageMs = 0, staleSec = WEEK } = {}) {
  const fresh = Math.max(60, Math.round(maxAgeSec - ageMs / 1000));
  res.setHeader('Cache-Control', `public, s-maxage=${fresh}, stale-while-revalidate=${staleSec}`);
}
