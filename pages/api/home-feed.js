// Logged-out home discovery feed: rotating episode carousels by goal / clinical
// area / career stage, plus the "new today" count. Identical for all users on a
// given day, so it's heavily cacheable.

import { buildDiscoverFeed, countNewToday } from '../../lib/home-feed';

export default async function handler(req, res) {
  try {
    const daySeed = Math.floor(Date.now() / 86400000); // rotates once per day
    const [rows, newToday] = await Promise.all([
      buildDiscoverFeed(daySeed),
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
