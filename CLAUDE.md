# The Dental Commute — Project Context for Claude Code

## What is The Dental Commute?
The Dental Commute is a dentistry resource directory and ranking platform for dental professionals — think Wirecutter meets Spotify, built for dentists. It ranks dental resources across categories: podcasts, books, YouTube channels, CE websites, software, residency programs, and specialty-specific resources.

**Primary audience:** General dentists, dental students, and all ADA-recognized specialties.

---

## Live URLs & Key IDs

| Resource | Value |
|---|---|
| Live site | https://thedentalcommute.com |
| GitHub repo | https://github.com/3000ways/denthub |
| Airtable Base ID | appICV69R7tzizCDY |
| Airtable Resources table ID | tblBlou0rXbImoQ75 |
| Airtable Categories table ID | tblQB6k8KVs1Lvta8 |
| Vercel Project ID | prj_v5umnsV6sj1wqQKXCr5hOI2XoNfg |
| Vercel Team ID | team_qncUnQooroOeHbDulYfvQWLx |

---

## Tech Stack

- **Frontend/Hosting:** Next.js deployed on Vercel
- **Database/CMS:** Airtable (resource/category content, accessed via API route at `/api/airtable`)
- **Accounts & user data:** Supabase (Postgres + Google OAuth) — powers sign-in and bookmarks
- **Source control:** GitHub (`3000ways/denthub`)
- **Auth:** Google sign-in live via Supabase (NPI-verified voting still planned)

---

## Architecture Notes

- Airtable data is fetched via a Next.js API route: `https://thedentalcommute.com/api/airtable?table=Resources`
- The sandbox/Claude Code cannot reach `api.airtable.com` or `api.vercel.com` directly — always verify data through the live API route above
- Environment variables live in Vercel only (never commit credentials to GitHub — GitHub secret scanning will block it)
- `AIRTABLE_PAT` is stored as a Vercel environment variable
- Vercel env variable changes only take effect after a new deployment; push a GitHub commit to trigger redeploy
- **Never use `{Visible}=1` boolean filter in Airtable** — it's unreliable; remove the filter entirely as a workaround
- Airtable MCP tools require table IDs (`tblXXX`) and field IDs (`fldXXX`), not names

### Supabase (accounts & bookmarks)
- Two data backends coexist on purpose: **Airtable = resource/category content**, **Supabase = per-user data** (logins, bookmarks). Don't move resource content into Supabase or user data into Airtable.
- Client lives at `lib/supabase.js`; auth state in `lib/auth-context.js`; bookmarks in `lib/bookmarks-context.js`.
- Sign-in is **Google OAuth** via Supabase (`signInWithGoogle`). Added in PR #2.
- Tables so far: `profiles` (one row per user, includes optional NPI for a verified badge) and `bookmarks` (`user_id` + `resource_id`).
- **Episode bookmarks (`episode_bookmarks` table).** Separate from `bookmarks`: saves an individual podcast *episode* (`user_id` + `episode_id` → `episodes.id`), not a whole show. Private per-user (own-read/insert/delete RLS), one row per (user, episode). Powers the bookmark icon on the audio player (`components/EpisodeBookmarkButton.js`, state in `lib/episode-bookmarks-context.js`) and the "Saved Episodes" section on `pages/saved.js`. Migration: `supabase/migrations/0004_episode_bookmarks.sql`. (The player's old whole-resource "helpful" 👍 was replaced by this episode-level save; the 👍 still lives on resource cards.)
- Env vars (in Vercel): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public/browser-safe by design — but never commit any **service-role** key.
- The phased voting system will build on this Supabase auth, not a new backend.
- **Community Pinboard (`pins` table).** A signed-in dentist pins one resource to a shared cork-board on the home page (`components/Pinboard.js`, shows the newest 4; pin action in `components/PinButton.js` on the resource page). The table is **public-read** (anyone, even signed-out, sees the board) with own-insert/own-delete RLS. Attribution ("Pinned by a periodontist in Ohio") is a **snapshot** of the pinner's `specialty` + `province_state` stored on the pin row — NOT a live profile join — so it works for public visitors, survives profile edits/deletion, and never exposes a name. Rate limit: **one pin per user per UTC day**, enforced by a unique index on `(user_id, pinned_on)`. Attribution/wording helpers in `lib/pins.js`. Migration: `supabase/migrations/0003_pins.sql`. **A pin can target a resource OR a single episode** (`0005_pins_episodes.sql`): `resource_id` is now nullable, there's a nullable `episode_id` → `episodes.id`, and a CHECK enforces exactly one target. `PinButton` takes `resourceId` (resource page) or `episodeId` (episode page); the board renders both (episode pins link to `/episode/[id]`). The one-per-day limit is shared across resource and episode pins. **Users can unpin their own pin** — via the ✕ on their card on the board, or the pin button on the resource/episode page (which flips to an "Unpin" control once pinned). Unpinning deletes the row, which frees that day's pin (the daily limit is just the unique index, so removing the row lifts it).
- **Claim Your Profile.** Resource owners claim their listing (Google sign-in, manually approved by Andrei) and can edit it. Three tables (migrations `0009`, RLS tightened in `0010`): `resource_claims` (pending/approved/rejected), `resource_owner_content` (bio/vision/featured episode ids — **auto-publishes**, public-read, write requires an *approved* claim on that resource, enforced by RLS via an `EXISTS` check against `resource_claims` — not just client-side trust), `resource_edit_proposals` (Name/URL/Description/Image/Host/RSS — **review-queue only**, applied to Airtable by Andrei via the admin **Claims** tab, never auto-published). Owner UI: `/creator/[id]` (editor — also shows the resource's live sub-scores + the AI judge's `Score Rationale`, so owners see exactly why their score is what it is) and `/my-resources` (dashboard). `components/ClaimButton.js` on the resource page replaces the old static mailto link. Admin: **Claims** tab handles both claim approval and edit-proposal review/apply, plus an "Invite an owner" panel. **Owner outreach is mailto-based** (drafted by the app, sent by Andrei himself) — no transactional email vendor wired up yet, by design (low volume, keeps the personal touch). Claiming/editing **never affects the score** — a "✓ Claimed" badge only.
- **Episode Archive exception (`episodes` table) — content in Supabase on purpose.** Normally content lives in Airtable, but the episode archive is a thousands+-row, full-text-searchable cache of public RSS data, so it lives in Supabase/Postgres. Resources still live in Airtable; only episodes are the exception. The `episodes` table is **public-read**; writes go only through the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY` — Vercel env, server-only, never exposed to the browser; client in `lib/supabase-admin.js`). A locked-down `harvest_state` table (service-role only) tracks per-show harvest progress and powers a coverage report. The harvester (`lib/harvester.js`) reads each podcast's RSS feed RSS-first (with pagination) and upserts episodes; it runs daily via Vercel Cron (`/api/cron/harvest-episodes`, guarded by `CRON_SECRET`) and is searched through `/api/episode-search`. Descriptions are capped at ~4 KB; full transcripts are a future (Phase C) concern, captured separately. (Phase A — added on branch `claude/episode-archive-phase-a`.)
- **Report / flag (`resource_reports` table).** Any visitor (signed-in OR anonymous) can flag a resource or a single episode as `broken`/`inappropriate`/`irrelevant`/`offensive`/`other`. Writes go **only through the service-role key** via `/api/report` (the table has RLS **on with no policies**, so anon/authenticated can neither read nor write) — the route verifies a **Cloudflare Turnstile** token (same public sitekey as the Submit form; secret `TURNSTILE_SECRET_KEY`) and stores only a **salted hash of the IP**, never the raw address. Anti-spam: **one report per IP per target per UTC day**, enforced by a unique index on `(reporter_ip_hash, target_key, reported_on)` where `target_key` is a generated `'r:<resourceId>'`/`'e:<episodeId>'`. A CHECK enforces exactly one target. UI: quiet `⚑ Report` link (`components/ReportButton.js`) in the resource hero's utility row and on episode pages. Admin triage in the **Reports** tab (`/api/admin/reports`) — grouped by target, resolve/dismiss/reopen; **nothing is ever auto-hidden**. Migration `0016`.

### Resource icon (logo) priority ladder
- The resource icon resolves through a strict ladder, highest wins: **owner logo** (`resource_owner_content.logo_url`, auto-publishes instantly, RLS-gated to the approved owner) → **human `Image URL`** (Airtable, Andrei's hand-pick) → **`Auto Image URL`** (Airtable, the machine "auto box") → **favicon** (`/api/airtable?logo=`) → **letter avatar**. The rule: **automation never overwrites a human-set image.**
- **`Auto Image URL` (Airtable field `fldRpJ7uHytIvc4jX`) is written by automation only.** For podcasts the **harvester** writes the RSS channel show-art there each run (`lib/harvester.js` → `updateAirtableAutoImage`), so it self-refreshes ~daily. The **Run Research** tab writes its AI-guessed image there too (not to `Image URL`), so a weak guess is a fallback that the harvester later upgrades. **Never hand-edit `Auto Image URL`.**
- `<Logo>` in `pages/resource/[id].js` reacts to a higher-priority image arriving after mount (owner logo loads client-side and takes over). Owners set their logo in the auto-publishing "From the creator" section of `/creator/[id]` (paste a URL), NOT the review queue.

### Resource-page episode list (one list, not four)
- The old separate **Featured / Recent / Notable** sections were collapsed into a single **"All Episodes"** list (`components/AllEpisodes.js`, DB-backed, newest-first, searchable). The creator's **featured episodes** (owner picks in `resource_owner_content.featured_episode_ids`) are **`★ Featured`-badged in place** — kept in their natural chronological position, never reordered — and a **"★ Featured" toggle** next to the search bar filters the list down to just them; there is no standalone Featured section. (No AI-featured system exists yet — featured = owner picks only. A future carousel can query these.)
- **Freshness — "refresh-on-view":** `AllEpisodes` calls `/api/refresh-show?id=` on mount, which runs `harvestShow(id)` (a single-show harvest in `lib/harvester.js`, **throttled to once per ~6h** via `harvest_state.last_harvested_at`), then quietly reloads page 1 if the count grew. This keeps the DB-backed list current without the old live-RSS "Recent" seam. `pages/api/podcast-single.js` is now only used by the **home page**, not the resource page.

---

## Data Structure

### Categories Table (`tblQB6k8KVs1Lvta8`)
- 49 categories across 8 themes
- Category tabs in the UI derive from live Airtable data (not hardcoded)

### Resources Table (`tblBlou0rXbImoQ75`)
- 24 dental podcasts seeded
- 10 YouTube channels seeded
- Population ongoing across remaining themes/categories

### 8 Themes
1. Learning & Education
2. Technology & Software
3. Coaching & Mentorship
4. Community & Network
5. Specialty Resources
6. Training & Career
7. Practice & Business
8. Wellbeing & Lifestyle

---

## Scoring Formula

Weighted composite score shown on each resource card with a hover tooltip:

| Component | Weight |
|---|---|
| Expert Score | 25% |
| Community Score | 25% |
| Popularity Score | 20% |
| Recency Score | 15% |
| Clinical Depth | 15% |

- Bayesian vote confidence adjustment is planned (to prevent gaming)
- Auth roadmap: launch as aggregator → add Google/Apple sign-in → NPI-verified voting

### Automated scoring engine
- **Scores are computed from real signals, not hand-set or AI-guessed.** `Final Score` is an Airtable **formula** (read-only); the engine only writes the five sub-scores. Math in `lib/scoring.js` (pure, unit-tested), orchestration in `lib/score-engine.js`.
- **Recency** — podcasts: episode archive (`resource_recency_signals` view); YouTube: recent upload dates; books: publication year. **Popularity** — YouTube subscriber count, podcast back-catalog size (weak reach proxy), book ratings count. **Community** — on-site votes + comments + bookmarks + pins. Each is percentile-ranked *within its type* and Bayesian-shrunk toward a neutral 50 for thin data. Unmeasurable types (coaching/software/…) get a neutral 50 for Recency/Popularity rather than a fabricated number.
- **Expert & Clinical Depth** — an **AI judge** (`lib/score-judge.js`) reads each resource's real recent content (episode/video titles) + web-searches the host's credentials, scores both against a fixed rubric via Perplexity, and writes a **cited rationale** to the `Score Rationale` Airtable field (auditable). It's **rotating**: judges the least-recently-judged batch each run, tracked by the `Last Judged` field.
- **Cadence:** one daily Vercel Cron hits `/api/cron/scoring` (keeps us within the cron-count limit): on **Mondays** it recomputes the data scores; on **other days** it judges the next rotating batch — one operation per day so it fits the 60s cap. The per-pass endpoints `/api/cron/recompute-scores` and `/api/cron/judge-scores` remain for **manual** admin triggering. All `CRON_SECRET`-guarded. The admin **Scoring** tab shows a **last-run status** panel (backed by the `scoring_runs` log table) so you can check weekly that it ran. Migrations `0006`–`0008`.

---

## UI / Design North Star

- **Magazine-style layout** — white background, strong typography, minimal decoration
- Inspired by publications like The Economist
- Horizontal theme tabs (filter behavior, NOT page jump)
- Two-column featured picks section
- Ranked scrollable list below featured picks
- **Visual appeal is a core product value** — reject anything that looks like a spreadsheet or card grid
- Resource logos use Google favicon service proxied through a Next.js API route (Clearbit failed for dental domains)

---

## Known Gotchas / Hard-Won Lessons

1. **GitHub secret scanning** blocks Airtable PATs — credentials must live in Vercel env vars only
2. **Airtable `{Visible}=1` filter is unreliable** — remove the filter entirely
3. **Airtable MCP requires IDs not names** — always use `tblXXX` and `fldXXX` formats
4. **Vercel env changes need a redeploy** — push a GitHub commit to trigger it
5. **No direct API access from sandbox** — use the live API route to verify data
6. **Category tabs must come from Airtable data** — never hardcode them

---

## Immediate Priorities

- Continue populating resources across remaining categories and themes
- Refine UI beyond current functional state (magazine aesthetic is north star)
- Implement phased user account and voting system
- Build out dental software rankings as a dedicated pillar

See `ROADMAP.md` (on `main`) for the detailed, evolving feature wish list.

---

## Roadmap / Planning Workflow

- The feature wish list lives in **`ROADMAP.md`** at the repo root. Read it at the
  start of planning sessions.
- **Roadmap / docs-only edits may be committed directly to `main`** (owner approved) —
  no branch or pull request needed for these notes.
- **Code/feature changes still go through a branch + pull request** so they can be
  reviewed before going live.

---

## Owner
Andrei — Endodontist & founder. Not a developer. Prefers plain-English explanations alongside any code changes. Always explain what a change does and why before making it.
