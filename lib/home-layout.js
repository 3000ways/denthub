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
// `heading`, when present, is the block's default visitor-facing title AND marks
// the block as renamable in the composer (settings.heading overrides it on the
// live home). Blocks without a `heading` either have no single title (chrome) or
// render several titles from other data (discover/personal/featured), so they
// aren't renamable here.
export const BLOCK_META = {
  ce_badge:          { name: 'CE hours badge',          type: 'chrome',   audiences: ['logged_in'] },
  recommended:       { name: 'Recommended for You',     type: 'carousel', audiences: ['logged_in'], heading: 'Recommended for You' },
  personal:          { name: 'Your carousels',          type: 'carousel', audiences: ['logged_in'] },
  essentials:        { name: 'The Essentials',          type: 'list',     audiences: ['both'], heading: 'The Essentials' },
  bookmarks:         { name: 'New from Bookmarks',      type: 'carousel', audiences: ['logged_in'], heading: 'New from your bookmarks' },
  recently_listened: { name: 'Continue Listening',      type: 'carousel', audiences: ['logged_in'], heading: 'Recently Listened' },
  books:             { name: 'Recommended Reading',     type: 'grid',     audiences: ['logged_in'], heading: 'Recommended Reading' },
  whats_new:         { name: "What's New in Dentistry", type: 'carousel', audiences: ['both'], heading: "What's New in Dentistry" },
  discover:          { name: 'Discover carousels',      type: 'carousel', audiences: ['both'] },
  pinboard:          { name: 'Community Pinboard',       type: 'chrome',   audiences: ['both'] },
  featured:          { name: 'Featured grids',          type: 'grid',     audiences: ['logged_in'] },
  new_this_week:     { name: 'New this week',           type: 'list',     audiences: ['both'], heading: 'New this week' },
};

// Is this block's visitor-facing title editable in the composer?
export function isRenamable(key) {
  return !!(BLOCK_META[key] && BLOCK_META[key].heading);
}

// The effective visitor-facing heading for a block: the admin's override if set
// and non-empty, else the block's default. Returns '' for non-titled blocks.
export function blockHeading(key, settings) {
  const custom = settings && typeof settings.heading === 'string' ? settings.heading.trim() : '';
  if (custom) return custom;
  return (BLOCK_META[key] && BLOCK_META[key].heading) || '';
}

// Resolve the effective ordered block list for an audience as [{key, settings}]:
// the published layout if one exists, else the code default (no settings). The
// published rows carry per-block settings (e.g. a custom heading) so the home can
// apply them. Accepts legacy plain-string rows too, for safety.
export function resolveLayout(published, audience) {
  const rows = published && published[audience];
  if (Array.isArray(rows) && rows.length) {
    return rows.map(r => typeof r === 'string' ? { key: r, settings: {} } : { key: r.key, settings: r.settings || {} });
  }
  return DEFAULT_LAYOUT.map(key => ({ key, settings: {} }));
}

// Is a block meaningful for a given audience? Signed-in-only blocks (e.g.
// bookmarks) never render for logged-out visitors, so the composer hides them
// from that audience's layout entirely.
export function blockAvailableFor(key, audience) {
  const meta = BLOCK_META[key];
  if (!meta) return false;
  return meta.audiences.includes('both') || meta.audiences.includes(audience);
}

// The default block list for one audience, as composer rows ({key,on,settings}).
// = DEFAULT_LAYOUT trimmed to the blocks that make sense for that audience,
// every one enabled. Used to seed the editor and as the publish/save fallback.
export function defaultBlocksFor(audience) {
  return DEFAULT_LAYOUT
    .filter(key => blockAvailableFor(key, audience))
    .map(key => ({ key, on: true, settings: {} }));
}
