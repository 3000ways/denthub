// Home-page layout config: the source of truth for which blocks render on the
// home page, in what order, per audience. In PR 1 the home renders the
// DEFAULT_LAYOUT below (= the current hand-built home) unless a published layout
// exists in the `home_layout` Supabase table. The admin "Home Layout" composer
// (PR 2) writes that table; until then this is a safe, invisible foundation.

export const AUDIENCES = ['logged_out', 'logged_in'];

// The default block order — reproduces today's home exactly. Each block
// self-guards (e.g. signed-in-only blocks render null when logged out), so this
// single list is correct for both audiences until the composer splits them.
export const DEFAULT_LAYOUT = [
  'ce_badge',
  'recommended',
  'personal',
  'essentials',
  'bookmarks',
  'recently_listened',
  'books',
  'whats_new',
  'discover',
  'pinboard',
  'featured',
  'new_this_week',
];

// Catalog metadata — used by the composer (PR 2) to label blocks and know which
// audience each belongs to. `audiences`: 'both' | 'logged_out' | 'logged_in'.
export const BLOCK_META = {
  ce_badge:          { name: 'CE hours badge',          type: 'chrome',   audiences: ['logged_in'] },
  recommended:       { name: 'Recommended for You',     type: 'carousel', audiences: ['logged_in'] },
  personal:          { name: 'Your carousels',          type: 'carousel', audiences: ['logged_in'] },
  essentials:        { name: 'The Essentials',          type: 'list',     audiences: ['both'] },
  bookmarks:         { name: 'New from Bookmarks',      type: 'carousel', audiences: ['logged_in'] },
  recently_listened: { name: 'Continue Listening',      type: 'carousel', audiences: ['logged_in'] },
  books:             { name: 'Recommended Reading',     type: 'grid',     audiences: ['logged_in'] },
  whats_new:         { name: "What's New in Dentistry", type: 'carousel', audiences: ['both'] },
  discover:          { name: 'Discover carousels',      type: 'carousel', audiences: ['both'] },
  pinboard:          { name: 'Community Pinboard',       type: 'chrome',   audiences: ['both'] },
  featured:          { name: 'Featured grids',          type: 'grid',     audiences: ['logged_in'] },
  new_this_week:     { name: 'New this week',           type: 'list',     audiences: ['both'] },
};

// Resolve the effective ordered block-key list for an audience: the published
// layout if one exists, else the default.
export function resolveLayout(published, audience) {
  const rows = published && published[audience];
  return Array.isArray(rows) && rows.length ? rows : DEFAULT_LAYOUT;
}
