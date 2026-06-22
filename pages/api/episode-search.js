// Fast episode search over the Supabase archive (Phase A).
//
// Replaces the live, recent-only PodcastIndex search: this queries our own
// harvested copy of every episode using Postgres full-text search, so results
// are instant and cover each show's entire back-catalog with no outside API at
// query time. Response shape matches the old /api/episodes-search so the UI is
// a drop-in swap.
//
// The browser-safe anon client is fine here: the `episodes` table is public-read.

import { supabase } from '../../lib/supabase';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default async function handler(req, res) {
  const { q, max = '20' } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }
  const maxN = Math.min(parseInt(max, 10) || 20, 50);

  try {
    const { data, error } = await supabase
      .from('episodes')
      .select('id, show_name, title, description, published_at, link, audio_url, image, duration_seconds')
      .textSearch('fts', q.trim(), { type: 'websearch', config: 'english' })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(maxN);

    if (error) throw new Error(error.message);

    const episodes = (data || []).map(ep => ({
      id:          ep.id,
      title:       ep.title,
      podcast:     ep.show_name,
      date:        formatDate(ep.published_at),
      description: ep.description ? ep.description.slice(0, 220) : null,
      image:       ep.image || null,
      url:         ep.link || null,
      audioUrl:    ep.audio_url || null,
      duration:    formatDuration(ep.duration_seconds),
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ episodes, count: episodes.length, query: q, source: 'archive' });
  } catch (err) {
    console.error('[episode-search] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
