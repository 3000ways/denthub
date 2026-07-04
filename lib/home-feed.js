// Builds the logged-out home-page "discovery" feed: a rotating stack of
// episode carousels grouped by goal / clinical area / career stage.
//
// Design notes:
// - The row labels come LIVE from the quiz_options taxonomy (admin-editable),
//   never a hardcoded list — so rows always match what episodes are tagged with.
// - A row is only returned if it has enough distinct-show episodes to fill a
//   carousel (MIN_ROW), so a thin tag can never render an empty/awkward row.
// - Which tags are featured rotates deterministically by day, so the page feels
//   fresh on repeat visits while staying fully cacheable (same for all users on
//   a given day).

import { supabase } from './supabase';
import { fetchQuizOptions, QUESTION_KEYS } from './onboarding';
import { DISCOVER_DEFAULT_COUNTS, PERSONAL_DEFAULT_COUNTS } from './home-layout';

const ROW_SIZE   = 12;  // cards per carousel
const MIN_ROW    = 6;   // don't render a carousel thinner than this
const FETCH_POOL = 48;  // over-fetch so we can dedupe by show and still fill a row

// How many rows of each kind to feature per day (goal-heavy on purpose). The
// admin can override these per audience in the Home Layout composer.
const COUNTS = DISCOVER_DEFAULT_COUNTS;
const EYEBROW = { goal: 'Listen by goal', interest: 'By clinical area', career: 'By career stage' };

const SELECT = 'show_resource_id, show_name, title, description, published_at, audio_url, image, guid';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function mapEpisodeToItem(ep) {
  return {
    type:        'podcast',
    show:        ep.show_name,
    resourceId:  ep.show_resource_id,
    title:       ep.title,
    url:         ep.audio_url,
    image:       ep.image || null,
    guid:        ep.guid || ep.audio_url,
    date:        formatDate(ep.published_at),
    description: ep.description ? ep.description.slice(0, 140) : null,
  };
}

// Deterministic rotation: cycle the list by `seed` so, over many days, every
// entry gets featured, without randomness (keeps the response cacheable).
function rotatePick(list, count, seed) {
  if (!Array.isArray(list) || list.length === 0) return [];
  if (list.length <= count) return list;
  const start = ((seed % list.length) + list.length) % list.length;
  return [...list.slice(start), ...list.slice(0, start)].slice(0, count);
}

// One episode carousel for a single tag: newest episodes carrying that tag,
// deduped to one per show for variety.
async function fetchRow({ kind, tag, eyebrow, title }) {
  const { data, error } = await supabase
    .from('episodes')
    .select(SELECT)
    .overlaps('quiz_tags', [tag])
    .not('audio_url', 'is', null)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(FETCH_POOL);
  if (error || !data) return null;

  const seenShows = new Set();
  const items = [];
  for (const ep of data) {
    const key = ep.show_resource_id || ep.title;
    if (seenShows.has(key)) continue;      // one episode per show for variety
    seenShows.add(key);
    items.push(mapEpisodeToItem(ep));
    if (items.length >= ROW_SIZE) break;
  }
  if (items.length < MIN_ROW) return null; // too thin — skip the row entirely

  return {
    kind,
    tag,
    eyebrow: eyebrow || EYEBROW[kind],
    title: title || tag,
    seeAllHref: `/browse?tag=${encodeURIComponent(tag)}&kind=${kind}`,
    items,
  };
}

// Personalized carousels for a signed-in dentist: one row per their own quiz
// answers (what they're working on, their clinical interests, their stage).
// Same per-row safety as the discovery feed (deduped, thin rows dropped). Runs
// client-side off the profile, like recommendEpisodes.
export async function buildPersonalFeed(profile, opts = {}) {
  if (!profile) return [];
  const counts = { ...PERSONAL_DEFAULT_COUNTS, ...(opts.counts || {}) };
  const cap = k => Math.max(0, Number.isFinite(counts[k]) ? counts[k] : PERSONAL_DEFAULT_COUNTS[k]);
  const specs = [
    ...(profile.focus_areas || []).slice(0, cap('goal')).map(tag => ({ kind: 'goal', tag, eyebrow: 'Because you’re working on' })),
    ...(profile.interests || []).slice(0, cap('interest')).map(tag => ({ kind: 'interest', tag, eyebrow: 'More on' })),
    ...((profile.career_stage && cap('career') > 0) ? [{ kind: 'career', tag: profile.career_stage, eyebrow: 'For your stage' }] : []),
  ];
  return (await Promise.all(specs.map(fetchRow))).filter(Boolean);
}

// The full rotating discovery feed for the home page.
//
// `opts.hidden` — tags the admin unchecked in the composer (never shown).
// `opts.counts` — per-kind row caps { goal, interest, career } (admin override).
// A count of 0 hides that whole kind. Rows rotate daily *within* the admin's
// kept tags, so the page still feels fresh but only ever features chosen topics.
export async function buildDiscoverFeed(daySeed = 0, opts = {}) {
  const hidden = new Set(Array.isArray(opts.hidden) ? opts.hidden : []);
  const counts = { ...COUNTS, ...(opts.counts || {}) };
  const quiz = await fetchQuizOptions();

  const pick = (quizKey, kind) => {
    const pool = (quiz[quizKey] || []).filter(tag => !hidden.has(tag));
    const n = Math.max(0, Number.isFinite(counts[kind]) ? counts[kind] : COUNTS[kind]);
    return rotatePick(pool, n, daySeed).map(tag => ({ kind, tag }));
  };

  const specs = [
    ...pick(QUESTION_KEYS.WORKING_ON, 'goal'),
    ...pick(QUESTION_KEYS.INTEREST, 'interest'),
    ...pick(QUESTION_KEYS.CAREER_STAGE, 'career'),
  ];

  const rows = (await Promise.all(specs.map(fetchRow))).filter(Boolean);
  return rows;
}

// Page size for the "See all" browse page (grid + Load More).
export const BROWSE_PAGE_SIZE = 24;

// The "See all" page's data: every episode carrying a tag, newest first,
// paginated, with optional full-text search. Not deduped by show — this is the
// full list. Returns the same card shape as the carousels for visual continuity.
export async function fetchEpisodesByTag({ tag, q = '', offset = 0, limit = BROWSE_PAGE_SIZE, withCount = false }) {
  if (!tag) throw new Error('Missing tag');
  let query = supabase
    .from('episodes')
    .select(SELECT, withCount ? { count: 'exact' } : undefined)
    .overlaps('quiz_tags', [tag])
    .not('audio_url', 'is', null);

  const term = (q || '').trim();
  if (term.length >= 2) query = query.textSearch('fts', term, { type: 'websearch', config: 'english' });

  query = query
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const items = (data || []).map(mapEpisodeToItem);
  return { items, total: withCount ? (count ?? null) : null, nextOffset: items.length === limit ? offset + limit : null };
}

// Count of episodes published "today" (UTC) — powers the "N new today" accent.
export async function countNewToday() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const { count, error } = await supabase
    .from('episodes')
    .select('show_resource_id', { count: 'exact', head: true })
    .gte('published_at', `${today}T00:00:00Z`);
  if (error) return 0;
  return count || 0;
}
