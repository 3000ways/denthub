// Shared query helper for a single show's full episode back-catalog.
//
// Used in two places so the ordering/mapping logic lives in exactly one spot:
//   - getStaticProps in pages/resource/[id].js (server-renders the first page
//     for SEO — episode titles become indexable content), and
//   - /api/resource-episodes (the client "Load More" + in-show search endpoint).
//
// The browser-safe anon client is fine here: the `episodes` table is public-read.

import { supabase } from './supabase';

// How many episodes per "page" (initial render and each Load More click).
export const EPISODES_PAGE_SIZE = 30;

// Below this many episodes, the in-show search box isn't worth showing — a small
// catalog is faster to just scroll. Keeps tiny shows clean/magazine-like.
export const EPISODE_SEARCH_THRESHOLD = 20;

const SELECT =
  'id, show_resource_id, show_name, title, description, published_at, link, audio_url, image, duration_seconds';

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

// Map a raw DB row to the shape EpisodeCard consumes. Mirrors the mapping in
// /api/episode-search so the same card renders identically everywhere.
export function mapEpisodeRow(ep) {
  return {
    id:               ep.id,
    title:            ep.title,
    podcast:          ep.show_name,
    show_name:        ep.show_name,
    show_resource_id: ep.show_resource_id,
    date:             formatDate(ep.published_at),
    publishedAt:      ep.published_at || null,
    description:      ep.description ? ep.description.slice(0, 220) : null,
    image:            ep.image || null,
    link:             ep.link || null,
    url:              ep.link || null,
    audio_url:        ep.audio_url || null,
    audioUrl:         ep.audio_url || null,
    duration:         formatDuration(ep.duration_seconds),
    duration_seconds: ep.duration_seconds || null,
  };
}

// Fetch one page of a show's episodes, optionally filtered by a full-text query.
//
// Pagination is offset-based (`.range()`) rather than keyset. At this scale
// (largest catalog ~2,500 rows, all indexed) offset is fast and — unlike a
// nulls-last keyset cursor in PostgREST — it's obviously correct across the
// dated/undated boundary. New episodes only arrive on the daily harvest, so the
// classic offset pitfall (rows shifting mid-scroll) is a once-a-day, near-zero
// risk here. Ordering is fully deterministic (date, then id) so pages never
// silently skip or repeat a row.
export async function fetchResourceEpisodes({
  id,
  sort = 'newest',
  q = '',
  offset = 0,
  limit = EPISODES_PAGE_SIZE,
  withCount = false,
}) {
  if (!id) throw new Error('Missing show id');
  const ascending = sort === 'oldest';

  let query = supabase
    .from('episodes')
    .select(SELECT, withCount ? { count: 'exact' } : undefined)
    .eq('show_resource_id', id);

  const term = (q || '').trim();
  if (term.length >= 2) {
    query = query.textSearch('fts', term, { type: 'websearch', config: 'english' });
  }

  // Undated episodes always sink to the bottom (nullsFirst: false) in both sort
  // directions; `id` is the stable tiebreaker for episodes sharing a date.
  query = query
    .order('published_at', { ascending, nullsFirst: false })
    .order('id', { ascending })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const episodes = (data || []).map(mapEpisodeRow);
  return {
    episodes,
    total: withCount ? (count ?? null) : null,
    // A full page implies there may be more; the next fetch confirms (returns []).
    nextOffset: episodes.length === limit ? offset + limit : null,
  };
}
