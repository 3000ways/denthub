// Logged-out home discovery feed: rotating episode carousels by goal / clinical
// area / career stage, plus the "new today" count. Identical for all users on a
// given day, so it's heavily cacheable.

import { buildDiscoverFeed, countNewToday } from '../../lib/home-feed';

// The home page passes the admin's Discover curation (from the active layout) as
// query params so it applies in both live and draft-preview, and stays cacheable.
function parseCuration(query) {
  let hidden = [];
  try { const h = JSON.parse(query.hidden || '[]'); if (Array.isArray(h)) hidden = h.filter(t => typeof t === 'string'); } catch {}
  const counts = {};
  ['goal', 'interest', 'career'].forEach(k => {
    if (query[k] !== undefined) {
      const n = parseInt(query[k], 10);
      if (Number.isFinite(n)) counts[k] = Math.max(0, Math.min(12, n));
    }
  });
  return { hidden, counts };
}

export default async function handler(req, res) {
  try {
    const daySeed = Math.floor(Date.now() / 86400000); // rotates once per day
    const [rows, newToday] = await Promise.all([
      buildDiscoverFeed(daySeed, parseCuration(req.query)),
      countNewToday(),
    ]);
    // Cache for an hour at the edge; rotation only changes daily anyway.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ rows, newToday });
  } catch (err) {
    console.error('[home-feed] error:', err.message);
    return res.status(200).json({ rows: [], newToday: 0 }); // fail soft — page just shows fewer rows
  }
}
