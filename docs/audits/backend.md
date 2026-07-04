# Backend Correctness & Reliability Audit

**Date:** 2026-07-04 · **Scope:** `pages/api/**`, `lib/**` (business/data logic), cron jobs, and the Supabase migrations they depend on. **Read-only review — nothing was changed.**
**Out of scope:** security (separate pass), UI components (touched only where they call the API routes reviewed here).

**Method:** direct review of the harvester, cron routes, delete-account, and pins/report SQL, plus three parallel review agents (admin routes / public routes / scoring+SQL). Every Critical and High finding below was verified line-by-line against the code; uncertainties are flagged inline.

**Severity scale:** Critical = data corruption or crash in normal use · High = wrong results in realistic cases · Medium = edge-case bug · Low = robustness nit.

---

## Critical

### C1. Harvester episode deletion cascade-destroys users' CE history, episode bookmarks, pins, and reports

**File:** [lib/harvester.js:201-205](../../lib/harvester.js) (`deleteEpisodesById`), invoked from the duplicate-show purge (line 332) and the orphan prune (line 352); cascade defined in `supabase/migrations/0002_listening_progress.sql:7`, `0004_episode_bookmarks.sql:11`, `0005_pins_episodes.sql:13`, `0016_resource_reports.sql:21` — all `REFERENCES public.episodes(id) ON DELETE CASCADE`.

**Failure scenario:** Andrei unpublishes (or deletes/merges) a podcast in Airtable. The next nightly harvest classifies its `harvest_state` row as an orphan and deletes all its `episodes` rows. Postgres then cascade-deletes every `listening_progress` row (the users' CE documentation — a legal record dentists rely on), every `episode_bookmarks` row, every episode pin, and every episode report for those episodes. Same happens for the "loser" of a duplicate-feed dedup: two Airtable records pointing at one feed → the duplicate's episodes are purged, and any user data attached to those episode ids dies with it, even though the identical episode still exists under the canonical show id. No warning, no backup, not recoverable.

**Suggested fix:** never hard-delete episodes that have dependent user rows. Options: (a) soft-delete (an `archived_at` column filtered out of queries) instead of `DELETE`; (b) before deleting, re-point `listening_progress`/`episode_bookmarks`/`pins` rows at the canonical twin's matching episode (match on guid) and only then delete; (c) at minimum, change the FKs on `listening_progress` and `episode_bookmarks` to `ON DELETE RESTRICT` so a prune that would destroy CE history fails loudly instead of silently.

---

## High

### H1. `/api/upsert-episode` corrupts the archive two ways: inconsistent guid derivation creates duplicate episodes, and sparse Play payloads null-out harvested metadata

**Files:** [pages/api/upsert-episode.js:17-31](../../pages/api/upsert-episode.js); guid producers: [lib/harvester.js:118](../../lib/harvester.js) (raw `<guid>`, no entity decoding), [pages/api/podcast-single.js:42](../../pages/api/podcast-single.js) (`stripHtml(guid)` — decodes/strips entities), [components/BookmarkFeed.js:31](../../components/BookmarkFeed.js) (always uses the audio URL as guid).

**Failure scenario (duplicates):** the harvester stores an episode keyed by the feed's raw `<guid>`. A user presses Play from the bookmarks carousel → `BookmarkFeed` upserts the same episode keyed by its audio URL → the `(show_resource_id, guid)` conflict never fires → a second row is inserted. Bookmarks, pins, and listening progress then split across two ids; search shows the episode twice; counts inflate. Any feed whose `<guid>` differs from the enclosure URL (the common case) triggers this on every first play from the home page feed. `podcast-single.js`'s `stripHtml` variant does the same for guids containing HTML entities (`&amp;` etc.).

**Failure scenario (null overwrite):** `SpotlightCard` and `BookmarkFeed` send no `description`, `published_at`, or `duration_seconds`, and the handler writes `published_at: published_at || null` etc. unconditionally. When the guid *does* match an existing harvested row (Spotlight's guid derivation matches the harvester's), pressing Play overwrites the row's real date, description, and duration with NULL. The episode drops out of date-ordered lists and recency signals, and duration-based CE-hours math breaks, until the next harvest of that show happens to rewrite it.

**Suggested fix:** one shared guid-derivation helper (raw trimmed guid → enclosure → link) used by harvester, spotlight, podcast-single, and all Play upserts; and make the upsert non-destructive (only set fields that are present in the request, e.g. by first checking for the existing row, or using a partial update on conflict).

### H2. Account deletion is fire-and-forget and doesn't cover all user tables

**Files:** [pages/api/delete-account.js](../../pages/api/delete-account.js); client flow [pages/profile.js:131-147](../../pages/profile.js).

**Failure scenario 1 (account survives, data gone):** `handleDeleteAccount` deletes `listening_progress`, `bookmarks`, `pins`, `profiles` — without checking a single result (supabase-js returns `{error}`, it does not throw) — then calls `/api/delete-account` whose response is also unchecked, inside a `try {} catch {}` that swallows everything. If the token is expired (401) or the route 500s, the user is signed out and redirected home believing the account is deleted, while the auth account still exists — with its profile and bookmarks already wiped.

**Failure scenario 2 (orphaned community data):** `votes`, `comments`, and `comment_upvotes` are never deleted client-side. Their table definitions are not in the repo's migrations (created via dashboard), so their FK cascade behavior is **UNVERIFIABLE from the repo**. If they lack `ON DELETE CASCADE`, a deleted user's votes and comments persist forever — and keep counting toward Community scores (`lib/score-engine.js` counts raw rows) — with no owner able to remove them (RLS requires `auth.uid()`, and the user is gone).

Tables that *are* safely covered by verified cascades from `auth.users`: `pins`, `episode_bookmarks`, `listening_progress`, `resource_claims`, `resource_owner_content`, `resource_edit_proposals`.

**Suggested fix:** move the entire cascade server-side into `/api/delete-account` (service role: delete votes/comments/upvotes/bookmarks/profile rows, then `deleteUser`), check every step, and return per-step status; the client should surface failure instead of silently signing out. Verify in the Supabase dashboard whether `votes`/`comments`/`comment_upvotes`/`bookmarks`/`profiles` have `ON DELETE CASCADE`, and add it if not.

### H3. Community (and recency) score inputs silently truncate at Supabase's 1000-row default cap

**File:** [lib/score-engine.js:63-76](../../lib/score-engine.js) (`fetchCommunitySignals`); same pattern at lines 54-57 (`fetchRecencySignals`, harmless until ~1000 shows) and [pages/api/admin/users.js:21-34](../../pages/api/admin/users.js) (member list caps at 1000 users; bookmark counts cap at 1000 rows).

**Failure scenario:** `db.from('votes').select('resource_id')` with no `.range()` returns at most 1000 rows (PostgREST `max-rows` default) — no error, just a truncated result. Once any of `votes`/`comments`/`bookmarks`/`pins` passes 1000 total rows (a realistic near-term milestone for bookmarks), Community scores silently undercount whichever resources' rows fall past the cutoff. This is the exact same silent-vanish failure mode as the project's known Airtable pagination gotcha, on the Supabase side.

**Suggested fix:** replace the full-table pulls with a grouped count (`SELECT resource_id, count(*) GROUP BY 1` via an RPC or view), or loop `.range(from, to)` until a short page. Same for `users.js`.

### H4. Admin fix-feeds can write the *wrong show's* feed URL (positional AI fallback)

**File:** [pages/api/admin/fix-feeds.js:169-178](../../pages/api/admin/fix-feeds.js).

**Failure scenario:** in the Perplexity fallback, when the name lookup misses (`byName` requires an exact lowercase match), the code falls back to positional matching: `if (!cand && cands[i]) cand = cands[i].rssUrl`. If the AI returns fewer entries, reorders them, or renames a show — all routine LLM behaviors — show A is assigned show B's feed. `validateFeed` only checks the feed has `<item>`s, not that it's the right show. `applyFix` then writes the wrong URL to Airtable and `harvest_state`, and the next harvest ingests the wrong show's episodes under show A's resource id — visible to every visitor on that resource page.

**Suggested fix:** verify the candidate feed's channel `<title>` against `show.show_name` (a `nameMatch` helper already exists at line 34) before `applyFix`; drop the raw positional fallback.

### H5. Change-password's auto-redeploy can never work (the known roadmap bug — diagnosed)

**File:** [pages/api/admin/change-password.js:47-62](../../pages/api/admin/change-password.js).

**Failure scenario:** the env-var update succeeds, but the redeploy request sends `gitSource: { type: 'github', repoId: null }` — Vercel's `POST /v13/deployments` rejects a null `repoId` with a 400 every time, so `deployed` is always false. Since env changes only take effect on a new deployment (documented gotcha in CLAUDE.md), the running deployment keeps the OLD password indefinitely. Symptom matches the roadmap bug exactly: "new password doesn't work, old one still does" — then days later an unrelated push deploys and the old password abruptly stops working. Secondary bug at line 41: the PATCH sets `target: ['production']`, silently stripping the var from preview/development if it was scoped to all environments.

**Suggested fix:** fetch the project's `link.repoId` from `GET /v9/projects/{id}` and pass it plus `ref: 'main'` — or redeploy the current production deployment by id. Preserve the env var's existing `target` array. Surface the fallback message prominently in the UI when the deploy call fails.

---

## Medium

### M1. Admin login succeeds with an empty password if `ADMIN_PASSWORD` is unset

**File:** [pages/api/admin/auth.js:5-8](../../pages/api/admin/auth.js). If the env var is missing (misconfigured deploy, or a preview env stripped by H5's `target` bug), `undefined === undefined` → admin cookie granted on an empty POST. Fix: return 500 when `process.env.ADMIN_PASSWORD` is falsy. *(Also a security item — noted here because a config slip silently changes behavior.)*

### M2. Missing Airtable offset-pagination in five places (the documented past-bug class, still present)

**Files:** [pages/api/book-stats.js:58-64](../../pages/api/book-stats.js), [pages/api/podcast-stats.js:77-83](../../pages/api/podcast-stats.js), [pages/api/youtube-stats.js:89-95](../../pages/api/youtube-stats.js), [pages/api/spotlight.js:19-27](../../pages/api/spotlight.js) — single GET, no `offset` loop: once a type crosses 100 records, records 101+ silently vanish from stats/spotlight (and from the scoring engine, which consumes youtube-stats/book-stats). Also [pages/api/admin/claims.js:11-25](../../pages/api/admin/claims.js) and [pages/api/admin/edit-proposals.js:13-27](../../pages/api/admin/edit-proposals.js): `resourceNames()` fetches one page and builds one giant `OR(RECORD_ID()=…)` formula — >100 ids lose names; a few hundred ids overflow the formula → non-OK → `return {}` → *all* names blank. Fix: copy the `do { … } while (offset)` loop used correctly in `airtable.js`, `lib/harvester.js`, and six other admin files; chunk `resourceNames()` like `reports.js:13-33` already does (chunks of 40).

### M3. AI-judge evidence query lets one prolific show starve the batch

**File:** [lib/score-judge.js:54-66](../../lib/score-judge.js). The episode-title evidence query uses a single global `LIMIT batch × 8` ordered by `published_at DESC` across all shows in the batch. A daily show's recent episodes can consume the whole limit; other shows in the batch are judged with "(no recent content list available)" and get less-grounded (typically lower) Expert/Clinical Depth scores. Fix: query per show, or a lateral "top 6 per show".

### M4. Judge rotation can be clogged by persistently-failing resources; failures are dropped silently

**File:** [lib/score-judge.js:146-167](../../lib/score-judge.js). `Last Judged` is stamped only on success, so a resource that fails every run (unparseable AI output, refusal) sorts to the head of every batch forever; with `limit=10`, ten such resources would monopolize the daily batch and the rest of the catalog would never be re-judged. Line 167 drops failures with zero logging, so this would be invisible. (Persistence of per-resource failure is UNCERTAIN — most failures are transient; the silent drop is verified.) Fix: log failures; add a "Last Attempted" stamp so poison records can't block rotation.

### M5. Airtable score-write loops have no 429/5xx retry — partial failure leaves the catalog half-updated

**Files:** [lib/score-engine.js:151-181](../../lib/score-engine.js), [lib/score-judge.js:128-136,178](../../lib/score-judge.js). Both PATCH loops throw on the first non-OK response mid-loop: half the resources carry Monday's fresh scores, half carry last week's, and nothing lands in `scoring_runs` (the log insert is only reached on full success). Self-heals on the next successful run (hence Medium, not High) — but with the Monday-only cadence (see L9) "next run" can be a week away. Fix: brief retry with backoff on 429/5xx; log partial progress.

### M6. Edit-proposal approval is a two-step write that can re-apply stale edits

**File:** [pages/api/admin/edit-proposals.js:56-66](../../pages/api/admin/edit-proposals.js). Airtable PATCH first, Supabase status update second. If the second write fails, the proposal stays `pending` with its changes already live; re-approving later re-applies the old proposal over any manual Airtable edits made in between. Fix: flag "applied" state separately, or return a distinct "applied but not marked — do not re-approve" error.

### M7. Incremental harvest reads only feed page 1 — multi-page gaps never backfill

**File:** [lib/harvester.js:381-382, 482-483](../../lib/harvester.js). Once a show is "seeded" (`episode_count > 0`), every subsequent harvest fetches page 1 only. A show whose feed was broken for months (or that publishes more episodes between harvests than one page holds) permanently misses the episodes that have scrolled past page 1 — no code path ever re-walks the full feed. Fix: periodic full re-walk (e.g. if `last full harvest > 30 days`), or detect a gap (fetched page's oldest item is newer than our newest stored episode) and keep paginating.

### M8. Spotlight: a transient Airtable failure is cached as *empty* for 6 hours; a timeout 500s

**File:** [pages/api/spotlight.js:14-26,137-140,185-186](../../pages/api/spotlight.js). `fetchAllFromAirtable` returns `[]` on any non-OK response; the handler caches that in memory for 6h plus `s-maxage=21600` at the CDN — one 429/503 blanks "What's New" for six hours. Separately, an Airtable *timeout* rejects through the unguarded `Promise.all` → raw 500. Fix: throw (or return null) on `!res.ok`, skip the cache write when a source failed, wrap the handler in try/catch.

### M9. `podcast-single` has no error handling around its two fetches

**File:** [pages/api/podcast-single.js:74-88](../../pages/api/podcast-single.js). The Airtable fetch and the RSS fetch (`AbortSignal.timeout(10000)`) both *reject* on timeout/DNS failure with no try/catch → raw 500, breaking the home-page podcast card instead of degrading to the empty shape the code clearly intends. A missing `AIRTABLE_PAT` is misreported as 404. Fix: try/catch returning `{ showArt: null, recent: [], notable: [] }`.

### M10. Submit endpoint: no timeouts or `maxDuration` on three outbound calls

**File:** [pages/api/submit.js:8-16,43-52,132](../../pages/api/submit.js). Turnstile verify has no try/catch (a Cloudflare blip → generic 500); the Perplexity `sonar-pro` call has no `AbortSignal` and the route exports no `maxDuration`, so a slow AI parse can hit Vercel's default function timeout → opaque 504 for the submitting user (UNCERTAIN — depends on plan default); the Airtable POST also has no timeout. Fix: timeouts + try/catch on all three; `export const config = { maxDuration: 60 }`.

### M11. Browse pagination on a non-deterministic sort can repeat/skip episodes

**File:** [lib/home-feed.js:151-153](../../lib/home-feed.js) (`fetchEpisodesByTag`). Orders by `published_at` only — no `id` tiebreaker — then offset-paginates; ties (especially the mutually-tied `published_at IS NULL` rows) have no stable order, so consecutive Load More pages on `/browse` can repeat or skip items. `lib/resource-episodes.js:91-94` adds `.order('id', …)` for exactly this reason. Fix: same tiebreaker here.

### M12. "Recommended for You" candidate pool fills with undated episodes

**File:** [lib/onboarding.js:64](../../lib/onboarding.js). `order('published_at', { ascending: false })` without `nullsFirst: false` — Postgres DESC puts NULLs first, so the 200-row candidate pool fills with undated episodes before any recent ones; recent matches never make the pool. Every sibling query passes `nullsFirst: false`; this one is the outlier. Fix: add it.

### M13. `featured.js`: unauthenticated PATCH + CDN-stale admin reads

**File:** [pages/api/admin/featured.js:12-52](../../pages/api/admin/featured.js). The only admin file with no `isAdminAuthenticated` check — deliberate for the public GET, but the PATCH (Airtable write) is unauthenticated too (security overlap; flagged here as structure). Correctness angle: the GET's `s-maxage=120` means the admin editor can read a 2-minute-stale list right after saving — saves look like no-ops. Also line 20 interpolates `section` into the formula unescaped (an apostrophe breaks the query). Fix: split the authed no-store admin route from the public cached GET.

### M14. Silent supabase-js error-swallowing in two admin flows

**Files:** [pages/api/admin/fix-feeds.js:117-120](../../pages/api/admin/fix-feeds.js) — `applyFix` ignores the `harvest_state` update result (supabase-js returns `{error}`, doesn't throw), so a failed update after a successful Airtable PATCH keeps the show counted as broken → wrong `remaining`/`done`, repeated AI spend. [pages/api/admin/research.js:168-174](../../pages/api/admin/research.js) — `logRun`'s try/catch can't catch a returned-error insert failure, so `research-status` shows a researched subcategory as `never`, steering the admin to redundant paid re-runs. Fix: check `error` on both.

---

## Low

- **L1. `percentile(null, peers)` returns 0, not neutral 50** — [lib/scoring.js:34](../../lib/scoring.js). Latent (current callers always pass numbers); a future caller gets a punitive 0. Fix: return 50 for null/NaN.
- **L2. Popularity "Bayesian shrinkage" is effectively a no-op** — [lib/score-engine.js:107-109](../../lib/score-engine.js). `n` is the signal magnitude itself (e.g. subscriber count ≈ tens of thousands), so `shrink(…, n, 50, 10)` returns the raw percentile unchanged; only near-zero resources get pulled toward 50. UNCERTAIN whether intended ("magnitude as confidence") — contradicts the "shrunk hard" comment in migration 0007. Fix if unintended: use a real evidence count or log-scaled n.
- **L3. Episode pins never credit any show's Community score** — [lib/score-engine.js:65-68](../../lib/score-engine.js). Episode pins have `resource_id = NULL`, so `bump()` skips them; episode-pin-heavy shows earn zero community signal from pins. UNCERTAIN if intended. Fix if not: join episode pins to `episodes.show_resource_id`.
- **L4. Judge JSON-fallback parse unwrapped** — [lib/score-judge.js:119](../../lib/score-judge.js). If the regex-extracted blob is still invalid JSON, the rejection is absorbed by `allSettled` and (per M4) dropped without a log. Fix: own try/catch + log the raw response.
- **L5. Duplicate migration version `0014`** — `0014_home_layout.sql` and `0014_research_runs.sql`. Fine applied by hand; conflicts if ever run through Supabase CLI migration tracking. Rename one.
- **L6. Tagger claim window (5 min) vs worst-case run time** — `supabase/migrations/0012:103` + [lib/episode-tagger.js](../../lib/episode-tagger.js). A stalled >5-min run lets a concurrent run reclaim in-flight rows → double AI spend (last write wins; no corruption). A 10-minute window adds margin. Related: the harvest cron ([pages/api/cron/harvest-episodes.js:60-66](../../pages/api/cron/harvest-episodes.js)) starts tagging whenever the harvest used <45s, but 150 episodes of parallel 45s-capped AI calls can overshoot the 60s function cap — self-healing via the claim expiry, but the cron response 500s.
- **L7. `stats.js` caches a failed count as `0` for an hour** — [pages/api/stats.js:21-29](../../pages/api/stats.js). The `error` field is never checked (supabase-js doesn't throw), so the home page can confidently say "0 episodes indexed" for an hour. Fix: check `error`, skip the cache write.
- **L8. Report/Turnstile verify has no timeout** — [pages/api/report.js:15-19](../../pages/api/report.js). A hung siteverify connection stalls the function. (Otherwise the endpoint is clean: XOR target validation, and the `23505` unique-violation → idempotent success path both check out.)
- **L9. Monday-only score recompute has no retry** — [pages/api/cron/scoring.js](../../pages/api/cron/scoring.js). If the single Monday 07:00 UTC run fails (Airtable hiccup), data scores go stale for a full week with no automatic retry. Fix: on Tue–Wed, check `scoring_runs` for a successful data pass this week and re-run if missing.
- **L10. `creator/resource.js` misleading error mapping** — [pages/api/creator/resource.js:17-20](../../pages/api/creator/resource.js). Network errors throw as raw 500s; any non-404 Airtable failure (429/5xx) is reported as "Resource not found".
- **L11. Favicon fallback fetch has no timeout** — [pages/api/airtable.js:25-28](../../pages/api/airtable.js) (the Clearbit attempt above it has one).
- **L12. `upsert-episode` lacks type validation** — [pages/api/upsert-episode.js:27-28](../../pages/api/upsert-episode.js). A malformed `published_at` or a `"1:02:03"` duration produces a Postgres type error → 500. (See H1 for the bigger problems on this route.)
- **L13. `fmtCount` rounding** — [pages/api/youtube-stats.js:20](../../pages/api/youtube-stats.js). 999,500–999,999 renders as "1000K" instead of "1M".
- **L14. Unbounded in-memory caches** — [pages/api/bookmark-feed.js:109,158](../../pages/api/bookmark-feed.js): every distinct bookmark set is a new never-evicted Map key within a warm lambda. Harmless at current scale.
- **L15. `detect-url` title mangling** — [pages/api/admin/detect-url.js:54,64](../../pages/api/admin/detect-url.js). Strips at the first hyphen anywhere ("E-Dental Weekly" → "E") and never checks `response.ok` (a 404 page's "Page not found" title gets used).
- **L16. `quiz-options` PATCH crash on `label: null`** — [pages/api/admin/quiz-options.js:45](../../pages/api/admin/quiz-options.js) (`label.trim()` → 500); POST's max-sort_order read-then-insert races under concurrent adds (cosmetic).
- **L17. `dedupes` re-emits pass-2 groups pairwise in pass 3** — [pages/api/admin/dedupes.js:102-150](../../pages/api/admin/dedupes.js). Duplicate rows in the admin UI for 3+ same-name records; no data harm.
- **L18. Admin list truncations** — [pages/api/admin/reports.js:63](../../pages/api/admin/reports.js) (hard limit 500, `total` under-reports); [pages/api/admin/research-status.js:64,86](../../pages/api/admin/research-status.js) (derives from newest 1000 runs; older subcategories flip `stale`→`never` once the log outgrows it).
- **L19. `submissions.js` approve-all `fields` param serialization** — [pages/api/admin/submissions.js:54](../../pages/api/admin/submissions.js). `URLSearchParams({ fields: ['Name'] })` serializes as `fields=Name` rather than `fields[]=Name`; Airtable may 422 the whole "Approve all". UNCERTAIN — worth a one-click test.
- **L20. `research.js` crashes on null AI array entries** — [pages/api/admin/research.js:213-214](../../pages/api/admin/research.js). A `null` element in Perplexity's array → `r.URL` throws → whole subcategory run 500s.
- **L21. No unit tests exist** — despite `lib/scoring.js`'s "unit-testable" header and CLAUDE.md's "pure, unit-tested" claim, there is no test file, test runner, or test script anywhere in the repo. The pure math in `lib/scoring.js` is cheap to cover and guards the percentile/shrink edge cases above.

---

## Verified clean (worth knowing)

- **Pins one-per-day rate limit is correct end to end:** race-safe DB unique index on `(user_id, pinned_on)` (UTC date default at insert), shared across resource and episode pins, unpin genuinely frees the day (b-tree indexes only cover live rows), the client handles the `23505` violation gracefully, and the 0005 XOR CHECK is sound.
- **`resource_reports` (0016) is correct:** XOR target check, immutable generated `target_key`, race-safe one-per-IP-per-target-per-day index, RLS-on-no-policies lockout, idempotent duplicate handling in `/api/report`.
- **Airtable offset-pagination is done right** everywhere except the five spots in M2 — including `airtable.js`, `lib/harvester.js`, both scoring libs, and six admin files. Score-write batching correctly chunks at 10 records/PATCH.
- **Episode pagination math** (`resource-episodes`, `browse-episodes`, `episode-search`) is correct — inclusive `.range()` arithmetic, deterministic `published_at, id` ordering (except M11), clamped offsets.
- **`harvestShow` refresh-on-view throttling** is correct (6h throttle, immediate retry after errors, duplicates never re-harvested, feed URL server-side only); concurrent double-triggers are benign (idempotent upserts).
- **`claim_untagged_episodes`** uses the textbook `FOR UPDATE SKIP LOCKED` concurrency-safe claim; the tagger whitelists AI-returned tags against the taxonomy, checks array length, and logs every failure path.
- **Recency view (0006/0007) SQL** is correct (clean integer day-diff, NULLs excluded, 90-day cadence window).
- **Scoring math edge cases** check out: percentile tie handling, all-equal peers → 50, `shrink` with n=0, negative/future freshness, weight renormalization in `composite`.

## Uncertainties to resolve (owner/dashboard access needed)

1. **Do `votes`, `comments`, `comment_upvotes`, `bookmarks`, `profiles` have `ON DELETE CASCADE` from `auth.users`?** Their SQL isn't in the repo. Determines the real severity of H2's orphan scenario. Check: Supabase dashboard → Database → each table's foreign keys.
2. **Is popularity's magnitude-as-confidence shrinkage (L2) intentional?**
3. **Should episode pins credit the show's Community score (L3)?**
4. **L19 (approve-all `fields` param)** — one click on the live admin page settles it.
