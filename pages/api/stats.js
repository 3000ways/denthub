// Public site stats for the home page (e.g. "32,251 episodes indexed").
//
// Only the episode count needs a query here — the home page already loads every
// published resource, so it counts podcasts/books/etc. client-side for free.
// Heavily cached (in-memory + CDN) so the database is touched at most ~once an
// hour regardless of traffic. These numbers change slowly (nightly harvest).

import { supabase } from '../../lib/supabase';

let cache = null;
let cacheTime = 0;
const TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < TTL) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  let episodes = 0;
  try {
    const { count } = await supabase.from('episodes').select('id', { count: 'exact', head: true });
    episodes = count || 0;
  } catch { /* leave at 0 if the count fails */ }

  const data = { episodes, fetchedAt: new Date().toISOString() };
  cache = data;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(data);
}
