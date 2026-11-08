// Chapters (one per paper) for the player, by our episode row id. Public,
// CDN-cached. Returns 404 for episodes that are not briefings.
import { getChaptersForEpisode } from '../../../lib/briefings-public';
import { setCdnCache } from '../../../lib/cdn-cache';

export default async function handler(req, res) {
  const id = Number(req.query.episode_id);
  if (!id) return res.status(400).json({ error: 'episode_id required' });
  try {
    const out = await getChaptersForEpisode(id);
    setCdnCache(res, 3600);
    if (!out) return res.status(404).json({ error: 'no chapters' });
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
