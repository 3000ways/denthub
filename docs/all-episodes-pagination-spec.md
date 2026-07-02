# Spec: "All Episodes" on resource pages (browse + search the full back-catalog)

_Status: Approved for build (not yet built). Owner: Andrei. Drafted: 2026-07-02._

## The idea in one line

Every podcast resource page should let you browse **all** of that show's episodes
(not just the recent handful) with a **Load More** button, and — on big shows —
**search within the show** for a specific episode.

## Why it's cheap to build

The hard part is already done. Every episode is already stored in Supabase (the
`episodes` table), indexed by show, with full-text search already running. This
feature is mostly wiring existing pieces together, not new invention.

---

## Decisions (all agreed with Andrei)

1. **New "All Episodes" section** on podcast resource pages, fed from the Supabase
   archive, with a **Load More** button (loads ~25–50 at a time and appends).
2. **Keep the existing live "Recent Episodes"** section at the top. It's pulled
   straight from the RSS feed, so it shows a brand-new episode instantly; the
   archive only refreshes daily, so it can lag ~24h at the very top. Recent (live)
   stays for freshness; All Episodes (archive) sits below as the complete catalog.
   The small overlap of the newest few episodes is harmless.
3. **Search-within-show box**, shown only on larger catalogs (roughly 20–30+
   episodes) so small shows stay clean. Empty box = normal browse. Typing = the
   same list swaps to ranked results within this show. Clearing = back to browse.
   Reuses the full-text search that already powers `/api/episode-search`.
4. **Search results also paginate** (same Load More treatment) so a broad query
   like "implant" on a huge show doesn't just move the wall.
5. **Newest / Oldest sort toggle.** Newest-first default; Oldest-first for serial
   shows people want to start from episode 1.
6. **Undated episodes** (no publish date) group at the **bottom**, never silently
   dropped. Pagination uses the episode `id` as a tiebreaker so it never skips or
   repeats a row when many episodes share a date.
7. **Server-render the first page** so episode titles are real, indexable content
   pointing at the `/episode/[id]` pages — an SEO win for a directory site.
8. **Scope: podcasts only.** YouTube "episodes" (videos) aren't in the `episodes`
   table, so video resource pages don't get this yet. Deliberate, not a bug.

---

## Harvest coverage check (run 2026-07-02, read-only)

Confirmed the archive is in great shape — Andrei's instinct was right.

- **38,608 episodes across 163 healthy shows.** Big catalogs are fully harvested
  **and fresh** (newest episodes dated late-June / July 2026):
  - The Dentalpreneur Podcast — **2,540** episodes (back to 2015)
  - Dentistry Uncensored with Howard Farran — 1,838
  - The Dental Hacks Podcast — 1,568
  - A Tale of Two Hygienists — 1,209; Dental A Team — 1,161; Today's RDH — 1,104
  - …and a long tail. The 2,500-episode case from the original ask literally
    exists and is fully covered.

### Gotchas the check surfaced — build around these

- **Empty catalogs happen (~45 shows have 0 episodes).** Causes: **11 shows error**
  on harvest (dead feeds — HTTP 404, or blocked — HTTP 403; e.g. "OMFS Podcast",
  "Dental Student Diaries"), and **34 shows are flagged duplicates** of another
  feed. **The "All Episodes" section must have a graceful empty state** ("Episode
  archive coming soon for this show") and not render a broken/empty box.
- **Duplicate resource records share one feed.** Several Airtable resource records
  point at the same podcast. The harvester attributes episodes to one record and
  marks the other a "duplicate" with 0 episodes — so a *duplicate* resource page
  can look empty even though the show is fully archived under its twin. This
  reinforces the existing roadmap item **"Remove duplicates in the admin portal"**;
  worth a cleanup pass, but the empty state covers it safely in the meantime.
- **One show (The Jocko Podcast) has all 871 episodes undated** — its feed exposes
  no parseable dates. That's ~871 of the 880 undated rows site-wide, i.e. undated
  episodes are rare and concentrated. Still, it proves the "all-undated show" edge
  case is real: such a show must still render and paginate (fall back to `id`
  ordering when there are no dates to sort by).
- **Huge feeds occasionally time out on refresh** (Dental Hacks, Dental A Team show
  a last-status "timeout"). Their back-catalogs are already fully stored, so display
  is unaffected — but it's a harvester-reliability note for the separate archive work,
  not a blocker for this feature.

**Bottom line:** no backfill needed before building. Coverage is strong; just make
sure the empty state and the undated/all-undated cases are handled.

---

## Technical design (for whoever builds it)

### Data access
- Source: `public.episodes`, filtered `where show_resource_id = <resource id>`.
  Indexes already exist: `episodes_show_idx` (show), `episodes_published_at_idx`
  (date), `episodes_fts_idx` (GIN full-text). Table is public-read, so the browser
  anon client is fine — no new RLS.
- **Never fetch the whole catalog at once.** PostgREST caps a request at ~1,000
  rows, and a 2,540-episode show would blow past it. Pagination is mandatory anyway.

### New endpoint (suggested): `/api/resource-episodes`
- Params: `id` (show_resource_id, required), `sort` (`newest`|`oldest`), `cursor`
  (opaque — last row's `published_at` + `id`), `q` (optional search string),
  `limit` (default ~30, cap ~50).
- Returns: a page of episodes (shape matching what `EpisodeCard` already consumes —
  mirror `/api/episode-search`'s mapping), a `nextCursor` (null when exhausted),
  and a one-time `total` count for the header ("312 episodes").
- **Keyset (cursor) pagination, not offset.** Order by `(published_at DESC, id DESC)`
  for newest; reverse for oldest. Undated rows sort last via `nulls last`, then by
  `id`. Keyset stays fast at episode 2,400 and is robust against new episodes
  arriving mid-scroll.
- **Search mode:** when `q` is present, add the same full-text filter
  `/api/episode-search` uses (`.textSearch('fts', q, { type: 'websearch' })`) plus
  `.eq('show_resource_id', id)`. Paginate results too.

### UI (`pages/resource/[id].js`)
- New "All Episodes" card **below** the existing Recent/Notable sections.
- Header: total count + the Newest/Oldest toggle.
- Search box appears only when `total >= ~20–30`.
- List reuses the existing `EpisodeCard` component (play, bookmark, link to
  `/episode/[id]`) — no new episode UI.
- **First page server-rendered** (via `getServerSideProps` or equivalent) for SEO
  and fast first paint; subsequent pages fetched client-side on Load More.
- Empty state for 0-episode shows; "showing undated episodes" divider if/when the
  list crosses into undated rows.

### Explicitly out of scope (for this pass)
- YouTube video listings (no data yet).
- Deduplicating the shared-feed resource records (separate admin cleanup).
- Fixing the dead/blocked feeds (separate harvester work).

---

## Suggested next steps when it's time to build
1. Build the `/api/resource-episodes` endpoint (browse + search + keyset paging).
2. Add the "All Episodes" section to the resource page with SSR first page.
3. Wire the search box + sort toggle.
4. QA against the extremes: Dentalpreneur (2,540), an all-undated show (Jocko),
   and a 0-episode show (empty state).
