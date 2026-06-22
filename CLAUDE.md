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
- Env vars (in Vercel): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The anon key is public/browser-safe by design — but never commit any **service-role** key.
- The phased voting system will build on this Supabase auth, not a new backend.
- **Episode Archive exception (`episodes` table) — content in Supabase on purpose.** Normally content lives in Airtable, but the episode archive is a thousands+-row, full-text-searchable cache of public RSS data, so it lives in Supabase/Postgres. Resources still live in Airtable; only episodes are the exception. The `episodes` table is **public-read**; writes go only through the **service-role key** (`SUPABASE_SERVICE_ROLE_KEY` — Vercel env, server-only, never exposed to the browser; client in `lib/supabase-admin.js`). A locked-down `harvest_state` table (service-role only) tracks per-show harvest progress and powers a coverage report. The harvester (`lib/harvester.js`) reads each podcast's RSS feed RSS-first (with pagination) and upserts episodes; it runs daily via Vercel Cron (`/api/cron/harvest-episodes`, guarded by `CRON_SECRET`) and is searched through `/api/episode-search`. Descriptions are capped at ~4 KB; full transcripts are a future (Phase C) concern, captured separately. (Phase A — added on branch `claude/episode-archive-phase-a`.)

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
