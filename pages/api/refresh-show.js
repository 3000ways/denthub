// Refresh-on-view: a podcast page calls this on load so its "All Episodes" list
// reflects the newest episodes without waiting for the nightly harvest. It
// harvests just this one show (throttled to at most once per window inside
// harvestShow), then returns the current episode count so the client can decide
// whether to quietly reload page 1.
//
// Public + unauthenticated by design: it only ever refreshes a single, already-
// tracked show's archive from that show's own RSS feed (the feed URL is looked
// up server-side, never taken from the request), and repeat calls are a cheap
// no-op thanks to the throttle. No user data is read or written.

import { harvestShow } from '../../lib/harvester';

// A seeded show fetches only its newest page (fast); a brand-new show may pull a
// full back-catalog, so give it headroom without risking Vercel's 60s cap.
export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  const id = req.query.id || (req.body && req.body.id);
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const result = await harvestShow(String(id));
    return res.status(200).json(result);
  } catch (err) {
    // Never surface a hard error to the page — the SSR list is already showing.
    return res.status(200).json({ error: String(err.message || err) });
  }
}
