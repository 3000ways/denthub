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
| Supabase project ref | zbwwzlvmtjftqpjkqpfz |
| Vercel Project ID | prj_v5umnsV6sj1wqQKXCr5hOI2XoNfg |
| Vercel Team ID | team_qncUnQooroOeHbDulYfvQWLx |

> **Airtable is retired (2026-08-03).** Resource/category content migrated to the
> Supabase `resources`/`categories` tables after the free-tier API cap (1,000
> calls/month) was exceeded by the daily crons and Airtable 429-blocked the site.
> The old base (appICV69R7tzizCDY) is kept as a frozen backup only — nothing
> reads or writes it. Historical Airtable notes below were rewritten accordingly.

---

## Tech Stack

- **Frontend/Hosting:** Next.js deployed on Vercel
- **Database:** Supabase (Postgres) — ALL data: resources, categories, episodes, accounts, community
- **Source control:** GitHub (`3000ways/denthub`)
- **Auth:** Google sign-in live via Supabase (NPI-verified voting still planned)

---

## Architecture Notes

- Resource/category content lives in the Supabase `resources` + `categories` tables
  (migrations `0020`/`0021`). The site still serves them through the legacy-named
  route `/api/airtable?table=Resources` in the exact Airtable record shape
  (`{ id, fields: {...} }`) so no consumer had to change.
- **Read layer:** `lib/resources-db.js` (anon client; RLS exposes only
  `status='Published'`, and the `submitter_email`/`editor_notes`/`voice_note`
  columns are revoked from anon). **Write/admin layer:** `lib/resources-db-admin.js`
  (service-role, server-only; accepts Airtable-style `{id, fields}`, ignores
  unknown fields, never writes `final_score`, mints new ids in the `rec...` format).
- `final_score` is a **generated column** replicating the old Airtable formula
  bit-for-bit (25/25/20/15/15 half-up in float math; NULL when Expert or Recency
  is blank/0) — verified 789/789 against the final Airtable export.
- Environment variables live in Vercel only (never commit credentials to GitHub — GitHub secret scanning will block it)
- **Local dev needs a `.env.local` (gitignored, NOT committed).** As of PR #80 the env file is no longer in the repo — running `npm run dev` without one makes every page 500 with "supabaseUrl is required". Recreate it by pulling the vars down from Vercel: `vercel env pull .env.local` (or copy them from the Vercel dashboard). Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus (feature-dependent) `PERPLEXITY_API_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`. (Vercel marks secrets "Sensitive", so `vercel env pull` writes `[SENSITIVE]` placeholders — the two `NEXT_PUBLIC_*` values are browser-public and can be filled in by hand.)
- Vercel env variable changes only take effect after a new deployment; push a GitHub commit to trigger redeploy

### Supabase (everything)
- Since the 2026-08 migration Supabase holds **all** data: resource/category content (`resources`/`categories`), the episode archive, and per-user data (logins, bookmarks, pins, votes, claims).
- Client lives at `lib/supabase.js`; auth state in `lib/auth-context.js`; bookmarks in `lib/bookmarks-context.js`.
- Sign-in is **Google OAuth** via Supabase (`signInWithGoogle`). Added in PR #2.
- Tables so far: `profiles` (one row per user, includes optional NPI for a verified badge) and `bookmarks` (`user_id` + `resource_id`).
- **Episode bookmarks (`episode_bookmarks` table).** Separate from `bookmarks`: saves an individual podcast *episode* (`user_id` + `episode_id` → `episodes.id`), not a whole show. Private per-user (own-read/insert/delete RLS), one row per (user, episode). Powers the bookmark icon on the audio player (`components/EpisodeBookmarkButton.js`, state in `lib/episode-bookmarks-context.js`) and the "Saved Episodes" section on `pages/saved.js`. Migration: `supabase/migrations/0004_episode_bookmarks.sql`. (The player's old whole-resource "helpful" 👍 was replaced by this episode-level save; the 👍 still lives on resource cards.)
- Env vars (in Vercel): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public/browser-safe by design — but never commit any **service-role** key.
- The phased voting system will build on this Supabase auth, not a new backend.
- **Community Pinboard (`pins` table).** A signed-in dentist pins one resource to a shared cork-board on the home page (`components/Pinboard.js`, shows the newest 4; pin action in `components/PinButton.js` on the resource page). The table is **public-read** (anyone, even signed-out, sees the board) with own-insert/own-delete RLS. Attribution ("Pinned by a periodontist in Ohio") is a **snapshot** of the pinner's `specialty` + `province_state` stored on the pin row — NOT a live profile join — so it works for public visitors, survives profile edits/deletion, and never exposes a name. Rate limit: **one pin per user per UTC day**, enforced by a unique index on `(user_id, pinned_on)`. Attribution/wording helpers in `lib/pins.js`. Migration: `supabase/migrations/0003_pins.sql`. **A pin can target a resource OR a single episode** (`0005_pins_episodes.sql`): `resource_id` is now nullable, there's a nullable `episode_id` → `episodes.id`, and a CHECK enforces exactly one target. `PinButton` takes `resourceId` (resource page) or `episodeId` (episode page); the board renders both (episode pins link to `/episode/[id]`). The one-per-day limit is shared across resource and episode pins. **Users can unpin their own pin** — via the ✕ on their card on the board, or the pin button on the resource/episode page (which flips to an "Unpin" control once pinned). Unpinning deletes the row, which frees that day's pin (the daily limit is just the unique index, so removing the row lifts it).
- **Claim Your Profile.** Resource owners claim their listing (Google sign-in, manually approved by Andrei) and can edit it. Three tables (migrations `0009`, RLS tightened in `0010`): `resource_claims` (pending/approved/rejected), `resource_owner_content` (bio/vision/featured episode ids — **auto-publishes**, public-read, write requires an *approved* claim on that resource, enforced by RLS via an `EXISTS` check against `resource_claims` — not just client-side trust), `resource_edit_proposals` (Name/URL/Description/Image/Host/RSS — **review-queue only**, applied to the `resources` table by Andrei via the admin **Claims** tab, never auto-published). Owner UI: `/creator/[id]` (editor — also shows the resource's live sub-scores + the AI judge's `Score Rationale`, so owners see exactly why their score is what it is) and `/my-resources` (dashboard). `components/ClaimButton.js` on the resource page replaces the old static mailto link. Admin: **Claims** tab handles both claim approval and edit-proposal review/apply, plus an "Invite an owner" panel. **Owner outreach is mailto-based** (drafted by the app, sent by Andrei himself) — no transactional email vendor wired up yet, by design (low volume, keeps the personal touch). Claiming/editing **never affects the score** — a "✓ Claimed" badge only.
- **Episode Archive (`episodes` table).** A thousands+-row, full-text-searchable cache of public RSS data. The `episodes` table is **public-read**; writes go only through the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY` — Vercel env, server-only, never exposed to the browser; client in `lib/supabase-admin.js`). A locked-down `harvest_state` table (service-role only) tracks per-show harvest progress and powers a coverage report. The harvester (`lib/harvester.js`) reads each podcast's RSS feed RSS-first (with pagination) and upserts episodes; it runs daily via Vercel Cron (`/api/cron/harvest-episodes`, guarded by `CRON_SECRET`) and is searched through `/api/episode-search`. Descriptions are capped at ~4 KB; full transcripts are a future (Phase C) concern, captured separately. (Phase A — added on branch `claude/episode-archive-phase-a`.)
- **Podcast feed resolver (`lib/resolve-feed.js`).** Deterministically finds a show's real RSS feed from its name/URL via a verified cascade — hint feed → Apple id lookup → **iTunes search by name** → homepage `<link rel=rss+xml>`/known-host/Apple-link discovery — accepting a candidate only if it actually fetches and parses as a feed with episodes (so a hallucinated or dead feed is never stored). This is what the Research agent and harvester previously *couldn't* do (the agent just asked the model to output a URL; `resolveFeedUrl` only ran on shows that already had a feed). Wired in two places: the **Research agent** ([research.js](pages/api/admin/research.js)) resolves + verifies each podcast's feed before insert (clears an unverifiable guess), and the harvester's **`repairMissingFeeds`** self-heals published podcasts with an empty `RSS Feed URL`, called opportunistically from the harvest cron with leftover time budget. `resolveFeedUrl` (Apple/Spreaker/rss.com page → feed) moved here from the harvester (re-exported for `fix-feeds.js`). Spotify-only shows stay unharvestable by design (Spotify hides RSS).
- **Report / flag (`resource_reports` table).** Any visitor (signed-in OR anonymous) can flag a resource or a single episode as `broken`/`ai_voice`/`inappropriate`/`irrelevant`/`offensive`/`other`. Writes go **only through the service-role key** via `/api/report` (the table has RLS **on with no policies**, so anon/authenticated can neither read nor write) — the route verifies a **Cloudflare Turnstile** token (same public sitekey as the Submit form; secret `TURNSTILE_SECRET_KEY`) and stores only a **salted hash of the IP**, never the raw address. Anti-spam: **one report per IP per target per UTC day**, enforced by a unique index on `(reporter_ip_hash, target_key, reported_on)` where `target_key` is a generated `'r:<resourceId>'`/`'e:<episodeId>'`. A CHECK enforces exactly one target (widened to include `ai_voice` in `0018`). UI: quiet `⚑ Report` link (`components/ReportButton.js`) in the resource hero's utility row and on episode pages. Admin triage in the **Reports** tab (`/api/admin/reports`) — grouped by target, resolve/dismiss/reopen; **nothing is ever auto-hidden**. Migration `0016`.

### AI Voice disclosure (flag AI-narrated podcasts)
- **What it is.** An editorial **disclosure** badge that tells listeners a show is narrated by an AI voice — purely informational (no score impact, by design; see the "AI Voice disclosure" roadmap theme). AI-generated podcasts are proliferating and are often less engaging, so upfront honesty is on-brand ("Wirecutter honesty").
- **⚠️ False-positive firewall (the whole design).** Wrongly labeling a real human's show as AI is insulting/defamatory and would alienate the exact creators we court via Claim Your Profile. So a **guess is never shown publicly**. `lib/voice.js` (`isPublicAiVoice`) is the single gate every public surface goes through: a show is publicly "AI voice" **only when Voice Type ∈ {AI-generated, Mixed} AND Voice Status = Confirmed** (human-verified by Andrei).
- **Data model — two columns on `resources` (editorial record):** `voice_type` (Human / AI-generated / Mixed) and `voice_status` (Suspected / Confirmed). `Suspected` is a listener/bot guess and stays **internal only**. Andrei sets these in the admin **All Resources** editor (a "🤖 AI Voice disclosure" block); the collapsed card shows a 🤖 chip (amber = confirmed/public, grey = suspected/internal).
- **Detection — cheapest first (roadmap phasing):** (1a) **listener reports** — a "Sounds AI-generated" (`ai_voice`) reason on the report button, which lands in the admin Reports queue as a *signal*, never auto-published. (1b) **player crowd-vote** (see below) — the main capture point. (2) **bot heuristic scan** (see below) — ✅ built. (3) audio analysis — **not built yet**.
- **Bot AI-voice scanner (Phase 2).** A **🔍 Scan for AI voices** button on the admin AI Voice tab summons `/api/admin/scan-ai-voices` to sweep every unconfirmed podcast for red flags and mark the likely ones **Suspected**. Heuristics in `lib/voice-detect.js` (pure, unit-guarded): the **RSS `<generator>` tag** naming a known AI tool (Wondercraft/NotebookLM/Podcastle/ElevenLabs/Play.ht…), **"AI/synthetic/TTS" wording** in show/episode text, **no human host + boilerplate copy**, and a **machine-like cadence + uniform durations**. Weighting is biased so only the *strong* signals (generator tag or explicit wording) can flag on their own — soft signals only corroborate (guards false positives; verified by a scoring test). Episode signals come from the Supabase archive we already store; only the `<generator>` tag needs a per-show RSS fetch. A **Perplexity second opinion** (untrusted-data-fenced, like the score judge) adds a rationale and can catch subtler cases. **Firewall:** the scan **only ever writes Voice Status = Suspected**, never Confirmed, and **never touches a Confirmed show**; its reasoning is written to the **`voice_note`** column (audit-only, never publicly readable). Batched (browser POSTs 4 ids/call) to fit the 60s cap. Suspected shows then appear in the AI Voice tab (which merges flagged shows with crowd votes) for one-click Confirm/Clear.
- **Player crowd-vote (`voice_votes` table).** A compact "Is this an AI voice?" control on the player (`components/VoiceVoteButton.js`, wired into both `PlayerBar.js` layouts) lets any listener answer **👤 Human / 🤖 AI / 🤷 Not sure** while they're actually hearing the show. Two-way on purpose: "human" votes are counter-evidence that **protects** a real creator from a false flag. Writes go **only through the service-role key** via `/api/voice-vote` (table is RLS-on/no-policies), gated by **Turnstile**, throttled to **one vote per IP per episode per UTC day** (re-voting upserts the verdict). Stores only a salted IP hash; anonymous is fine. Votes are captured per-episode with the show's `resource_id` denormalized for rollup. **Signal only — never a public label:** the admin **AI Voice** tab (`/api/admin/voice-votes`) groups votes by show, sorts by AI-share, and one-click sets `voice_type`/`voice_status` (the human-confirm step). Migration `0019`.
- **The badge.** `🤖 AI voice` (or `🤖 Partial AI voice` for Mixed) on the resource hero (`pages/resource/[id].js`) and on resource cards (`components/FeaturedCards.js`), gated on `isPublicAiVoice`.
- **Exclude-from-recommendations (listener preference).** A global **"Hide AI-narrated podcasts"** toggle (`components/AiVoiceToggle.js`) stored in the browser (`lib/use-ai-voice-pref.js`, localStorage key `tdc_hide_ai_voices`; upgrades to per-account for free later). When on, `/api/ai-voice-shows` (public, edge-cached — returns the Confirmed AI-voice resource ids) drives an `isHiddenShow(resourceId)` filter across the episode feeds (`DiscoverFeed`, `PersonalFeed`, `/browse`) and resource cards (`FeaturedCards`). Only **Confirmed** shows are ever affected. Toggle lives on the **/browse** header and the **profile** page ("Listening Preferences").

### Resource icon (logo) priority ladder
- The resource icon resolves through a strict ladder, highest wins: **owner logo** (`resource_owner_content.logo_url`, auto-publishes instantly, RLS-gated to the approved owner) → **human `image_url`** (Andrei's hand-pick) → **`auto_image_url`** (the machine "auto box") → **favicon** (`/api/airtable?logo=`) → **letter avatar**. The rule: **automation never overwrites a human-set image.**
- **`auto_image_url` is written by automation only.** For podcasts the **harvester** writes the RSS channel show-art there each run (`lib/harvester.js` → `updateAirtableAutoImage`), so it self-refreshes ~daily. The **Run Research** tab writes its AI-guessed image there too (not to `Image URL`), so a weak guess is a fallback that the harvester later upgrades. **Never hand-edit `Auto Image URL`.**
- `<Logo>` in `pages/resource/[id].js` reacts to a higher-priority image arriving after mount (owner logo loads client-side and takes over). Owners set their logo in the auto-publishing "From the creator" section of `/creator/[id]` (paste a URL), NOT the review queue.

### Resource-page episode list (one list, not four)
- The old separate **Featured / Recent / Notable** sections were collapsed into a single **"All Episodes"** list (`components/AllEpisodes.js`, DB-backed, newest-first, searchable). The creator's **featured episodes** (owner picks in `resource_owner_content.featured_episode_ids`) are **`★ Featured`-badged in place** — kept in their natural chronological position, never reordered — and a **"★ Featured" toggle** next to the search bar filters the list down to just them; there is no standalone Featured section. (No AI-featured system exists yet — featured = owner picks only. A future carousel can query these.)
- **Freshness — "refresh-on-view":** `AllEpisodes` calls `/api/refresh-show?id=` on mount, which runs `harvestShow(id)` (a single-show harvest in `lib/harvester.js`, **throttled to once per ~6h** via `harvest_state.last_harvested_at`), then quietly reloads page 1 if the count grew. This keeps the DB-backed list current without the old live-RSS "Recent" seam. `pages/api/podcast-single.js` is now only used by the **home page**, not the resource page.

---

## Data Structure

### Categories Table (`tblQB6k8KVs1Lvta8`)
- 49 categories across 8 themes
- Category tabs in the UI derive from live `categories` data (not hardcoded)

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
- **Scores are computed from real signals, not hand-set or AI-guessed.** `final_score` is a Postgres **generated column** (read-only, replicates the old Airtable formula exactly); the engine only writes the five sub-scores. Math in `lib/scoring.js` (pure, unit-tested), orchestration in `lib/score-engine.js`.
- **Recency** — podcasts: episode archive (`resource_recency_signals` view); YouTube: recent upload dates; books: publication year. **Popularity** — YouTube subscriber count, podcast back-catalog size (weak reach proxy), book ratings count. **Community** — on-site votes + comments + bookmarks + pins. Each is percentile-ranked *within its type* and Bayesian-shrunk toward a neutral 50 for thin data. Unmeasurable types (coaching/software/…) get a neutral 50 for Recency/Popularity rather than a fabricated number.
- **Expert & Clinical Depth** — an **AI judge** (`lib/score-judge.js`) reads each resource's real recent content (episode/video titles) + web-searches the host's credentials, scores both against a fixed rubric via Perplexity, and writes a **cited rationale** to the `score_rationale` column (auditable). It's **rotating**: judges the least-recently-judged batch each run, tracked by the `last_judged` column.
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

1. **GitHub secret scanning** blocks committed credentials — they must live in Vercel env vars only
2. **Vercel env changes need a redeploy** — push a GitHub commit to trigger it
3. **Verify live data through the live API routes** (e.g. `/api/airtable?table=Resources`) or the Supabase MCP
4. **Category tabs must come from the `categories` table** — never hardcode them
5. **Historic quirk to preserve:** `final_score` must keep replicating the old Airtable formula (float math, half-up, blank when Expert/Recency blank-or-0) unless a re-rank is a deliberate decision

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
