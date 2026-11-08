// Public site stats for the home page (e.g. "32,251 episodes indexed").
//
// Only the episode count needs a query here — the home page already loads every
// published resource, so it counts podcasts/books/etc. client-side for free.
// Heavily cached (in-memory + CDN) so the database is touched at most ~once an
// hour regardless of traffic. These numbers change slowly (nightly harvest).

import { supabase } from '../../lib/supabase';
import { setCdnCache } from '../../lib/cdn-cache';

let cache = null;
let cacheTime = 0;
const TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < TTL) {
    setCdnCache(res, 3600, { ageMs: Date.now() - cacheTime });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  let episodes = 0;
  try {
    // An exact count of the whole table runs past the database's time limit and
    // comes back empty, so use Postgres's estimate, rounded down to the thousand.
    const { count } = await supabase.from('episodes').select('id', { count: 'planned', head: true });
    episodes = Math.floor((count || 0) / 1000) * 1000;
  } catch { /* leave at 0 if the count fails */ }

  const data = { episodes, fetchedAt: new Date().toISOString() };

  // A failed count must not stick for an hour: answer it, but keep it only briefly.
  if (!episodes) {
    setCdnCache(res, 60, { staleSec: 0 });
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  }

  cache = data;
  cacheTime = Date.now();

  setCdnCache(res, 3600);
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(data);
}
