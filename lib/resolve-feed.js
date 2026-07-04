// Deterministic podcast-feed resolver.
//
// Given a show's name and/or URL, find its REAL RSS feed through a cascade of
// deterministic lookups — never a language-model guess:
//   1. an existing hint feed (e.g. what the AI proposed) — used only if it verifies
//   2. Apple Podcasts id in the URL → iTunes lookup
//   3. the URL itself, normalized through resolveFeedUrl (Apple/Spreaker/rss.com pages)
//   4. iTunes SEARCH by name → the show's canonical feed
//   5. homepage discovery — the page's <link rel="alternate" rss+xml>, a known
//      podcast-host feed URL, or an Apple Podcasts link it embeds
// Every candidate is VERIFIED (fetched and parsed — must look like a feed with at
// least one item) before it's accepted, so we never store a dead or wrong feed.
//
// This is why the resolver finds feeds the Research agent (which only asked the
// model to output a URL) and the harvester (which only ran on shows that already
// had a feed) could not. Pure and serverless-safe: uses only fetch, no DB.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_MS = 6000;   // per-request timeout
const CAP_MS   = 14000;  // hard ceiling on a single resolve (bounds the whole cascade)

async function fetchText(url, ms = FETCH_MS) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ── Platform page → feed (Apple Podcasts / rss.com / Spreaker) ────────────────
// Moved here from the harvester so both it and the Research agent share one copy.
// Heuristic and best-effort: on any failure we return the original URL unchanged.
export async function resolveFeedUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  let u;
  try { u = new URL(rawUrl); } catch { return rawUrl; }
  const host = u.hostname.replace(/^www\./, '');

  // Apple Podcasts page -> real feed via the public iTunes lookup API.
  const appleId = host.endsWith('apple.com') && u.pathname.match(/\/id(\d+)/);
  if (appleId) {
    const feed = await itunesLookup(appleId[1]);
    return feed || rawUrl;
  }

  // rss.com listing page (rss.com/podcasts/<slug>/) -> media feed.
  if (host === 'rss.com') {
    const m = u.pathname.match(/\/podcasts\/([^/]+)/);
    if (m) return `https://media.rss.com/${m[1]}/feed.xml`;
  }

  // Spreaker page (/podcast/<slug>--<id> or /show/<id>/...) -> show feed.
  if (host === 'spreaker.com') {
    const m = u.pathname.match(/--(\d+)/) || u.pathname.match(/\/show\/(\d+)/);
    if (m) return `https://www.spreaker.com/show/${m[1]}/episodes/feed`;
  }

  return rawUrl;
}

// ── iTunes helpers ────────────────────────────────────────────────────────────

async function itunesLookup(id) {
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`, { signal: AbortSignal.timeout(FETCH_MS) });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.results && j.results[0] && j.results[0].feedUrl) || null;
  } catch { return null; }
}

function normName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\bthe\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// A confident name match: identical after normalization, or one is fully contained
// in the other with the shorter side long enough that it can't be a generic token.
// Keeps a generic query ("Oral Surgery Podcast") from grabbing a different show.
function nameMatches(query, candidate) {
  const a = normName(query), b = normName(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.includes(short) && short.length >= 8;
}

async function itunesSearch(name) {
  try {
    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=podcast&limit=10`, { signal: AbortSignal.timeout(FETCH_MS) });
    if (!r.ok) return null;
    const j = await r.json();
    for (const res of j.results || []) {
      if (res.feedUrl && nameMatches(name, res.collectionName)) return res.feedUrl;
    }
    return null;
  } catch { return null; }
}

// ── Homepage discovery ────────────────────────────────────────────────────────

function appleIdFrom(url) {
  const m = (url || '').match(/apple\.com\/[^\s"']*\/id(\d+)/i);
  return m ? m[1] : null;
}

// Known podcast-host feed URL shapes, matched inside a page's HTML.
const HOST_FEED_RE = new RegExp(
  '(https?://(?:' +
    'feeds?\\.buzzsprout\\.com/\\d+\\.rss|' +
    '[a-z0-9-]+\\.libsyn\\.com/rss|' +
    'feed\\.podbean\\.com/[^\\s"\'<>]+/feed\\.xml|' +
    'anchor\\.fm/s/[^\\s"\'<>]+/podcast/rss|' +
    'feeds\\.transistor\\.fm/[^\\s"\'<>]+|' +
    'feeds\\.captivate\\.fm/[^\\s"\'<>]+|' +
    'feeds\\.simplecast\\.com/[^\\s"\'<>]+|' +
    'feeds\\.megaphone\\.fm/[^\\s"\'<>]+|' +
    'feeds\\.soundcloud\\.com/[^\\s"\'<>]+' +
  '))', 'i'
);

async function discoverFromPage(url) {
  let html;
  try { html = await fetchText(url); } catch { return null; }

  // 1. Explicit RSS <link> tag.
  const link = html.match(/<link[^>]+type=["']application\/rss\+xml["'][^>]*>/i);
  if (link) {
    const href = link[0].match(/href=["']([^"']+)["']/i);
    if (href) return href[1];
  }
  // 2. A known host's feed URL sitting in the page.
  const hostFeed = html.match(HOST_FEED_RE);
  if (hostFeed) return hostFeed[1];
  // 3. An Apple Podcasts link on the page → resolve via iTunes.
  const appleLink = appleIdFrom(html);
  if (appleLink) { const f = await itunesLookup(appleLink); if (f) return f; }

  return null;
}

// ── Verify ────────────────────────────────────────────────────────────────────

async function feedHasItems(url) {
  try {
    const xml = await fetchText(url, 8000);
    return /<rss[\s>]|<feed[\s>]/i.test(xml) && /<item[\s>]|<entry[\s>]/i.test(xml);
  } catch { return false; }
}

// ── Public API ────────────────────────────────────────────────────────────────

async function _resolve({ name, url, hintFeed } = {}) {
  // Try a candidate: normalize platform pages to a feed, then require it to
  // actually parse as a feed with episodes before accepting it.
  const tryCandidate = async (candidate, source) => {
    if (!candidate) return null;
    const feed = await resolveFeedUrl(candidate);
    if (feed && await feedHasItems(feed)) return { feedUrl: feed, source };
    return null;
  };

  let hit;
  // 0. Trust the hint (e.g. the AI's guess) only if it verifies.
  if ((hit = await tryCandidate(hintFeed, 'hint'))) return hit;
  // 1. Apple id embedded in the main URL.
  const appleId = appleIdFrom(url);
  if (appleId) { const f = await itunesLookup(appleId); if ((hit = await tryCandidate(f, 'apple-id'))) return hit; }
  // 2. The URL itself (a feed, or an Apple/Spreaker/rss.com page).
  if ((hit = await tryCandidate(url, 'url'))) return hit;
  // 3. iTunes search by name.
  if (name) { const f = await itunesSearch(name); if ((hit = await tryCandidate(f, 'apple-search'))) return hit; }
  // 4. Homepage discovery.
  if (url && /^https?:\/\//i.test(url)) { const f = await discoverFromPage(url); if ((hit = await tryCandidate(f, 'homepage'))) return hit; }

  return null;
}

// Resolve a show's real, verified RSS feed. Returns { feedUrl, source } or null.
// Hard-capped so a slow site can never hang a batch caller.
export async function resolvePodcastFeed(opts = {}) {
  return Promise.race([
    _resolve(opts),
    new Promise(resolve => setTimeout(() => resolve(null), CAP_MS)),
  ]);
}
