// Paginated browse + in-show search for a single show's full episode archive.
//
// Powers the "All Episodes" section on a podcast resource page: the client hits
// this on each Load More click, on a sort-order flip, and on every search query.
// The first page is server-rendered in getStaticProps (see lib/resource-episodes),
// so this endpoint only serves pages 2+ and search results.

import { fetchResourceEpisodes, EPISODES_PAGE_SIZE } from '../../lib/resource-episodes';

export default async function handler(req, res) {
  const { id, sort = 'newest', q = '', offset = '0', count } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const sortMode = sort === 'oldest' ? 'oldest' : 'newest';

  try {
    const result = await fetchResourceEpisodes({
      id,
      sort: sortMode,
      q,
      offset: off,
      limit: EPISODES_PAGE_SIZE,
      withCount: count === '1', // total is only needed for the header on a reset fetch
    });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[resource-episodes] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
