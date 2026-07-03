// Paginated + searchable episodes for one tag — powers the "See all" browse
// page's Load More button and its in-page search.

import { fetchEpisodesByTag, BROWSE_PAGE_SIZE } from '../../lib/home-feed';

export default async function handler(req, res) {
  const { tag, q = '', offset = '0', count } = req.query;
  if (!tag) return res.status(400).json({ error: 'Missing tag' });
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  try {
    const result = await fetchEpisodesByTag({
      tag, q, offset: off, limit: BROWSE_PAGE_SIZE, withCount: count === '1',
    });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[browse-episodes] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
