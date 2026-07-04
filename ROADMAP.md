# The Dental Commute — Roadmap

A running wish list of features and improvements. Plain English, no code required.
Move items between sections as work progresses. When an item is ready to actually
build, we can promote it to a GitHub Issue.

_Last updated: 2026-07-01_

---

## 🎯 Big Theme: Revamp the home page (more interactive, engaging, fresh)

The home page leans static and directory-like today. The goal is a home page that
feels alive on every visit and gives people things to do — and that eventually
personalizes itself to each dentist. Broken into quick wins (Next) and a larger
personalization system (Later).

### Primary layout — vertical feed of horizontal carousels (Netflix/Spotify-style)

Make browsing podcasts the main navigation paradigm: a **vertical feed** where **each
category is a horizontal carousel** of cards. Scroll vertically for new categories, swipe
horizontally to browse within one — responsive on mobile and desktop, like modern
streaming platforms. This maps naturally onto **Channels** (each row ≈ a channel/category).

- **Open decision — cards = shows or episodes?** The request said "make *episode-level*
  navigation the main way" but described "*podcast cards*." Decide whether each carousel
  holds **podcast/show cards** (browse shows → drill into episodes) or **episode cards**
  (browse individual episodes directly). Changes the whole feel; confirm with Andrei.
- **⚠️ North-star note (intentional evolution).** `CLAUDE.md` currently says magazine-style,
  "reject anything that looks like a card grid," Economist-inspired. A carousel-of-cards
  layout is a deliberate move *toward* the modern-platform look — a conscious update to the
  design north star, not an accident. Reconcile CLAUDE.md's design section when built.

### Quick wins — fresh home-page modules ("Option B")
_Lower effort, mostly using content/data we already have._

- **Editor's Pick / Andrei's Pick** — a featured resource with a short personal
  blurb you write. Human voice + your expert credibility = engagement.
- **Trending this week** — resources climbing in votes/score.
- **Clinical pearl of the day** — a short quote/takeaway pulled from a recent episode.
- **Dynamic hero** — replace the static tagline with a rotating "Resource of the week"
  or the single hottest new episode (cover art), so the top of the page changes.

### The big idea — Channels + personalized onboarding ("Spotify for dentists")
_Larger system. Build in the order below; the tagging step is the foundation everything
else depends on._

1. **Tagging foundation (do first).** 🚧 _In progress (2026-06-16)._ Rather than one
   free-form Tags field, we decided on **separate fields per dimension** (cleaner for
   Channels + the quiz, where each quiz question maps to one field). Three dimensions:
   - _Specialty_ — Endodontics, Ortho, Perio… **(field already exists, well populated)**
   - _Career stage_ — Student, New Grad, Associate, Practice Owner, Thinking of Selling
     **(new `Career Stage` field added; replaces the old lightly-used `Audience` field)**
   - _Goals / outcomes_ — the "reasons to listen" taxonomy (selling your practice,
     increasing EBITDA, introducing implants, going digital, beating burnout…)
     **(new `Goals / Outcomes` field added with the ~18-outcome v1 list; see the
     "Why should you listen?" theme below)**
   - The old junk `Tags` field (a mashup that duplicated Specialty/Topic and was never
     populated) is being **retired**; admin import paths no longer write to it.
   - Note: channels only feel good once enough resources are tagged — a channel with
     2 items feels empty. This is the biggest content-work item. Approach: **AI-assisted
     first pass** (suggest goal/career tags from each resource's description, drawn only
     from the fixed vocabulary) **+ human review** before anything goes live.
   - _Manual Airtable cleanup still pending (destructive, done by hand):_ delete the old
     `Tags` field, delete the old `Audience` field, and remove the non-specialty values
     that leaked into `Specialty` (Business & Leadership, Personal Finance, Health &
     Wellness, All Specialties).

2. **Channels** — curated, cross-category bundles ("playlists") sitting on top of the
   tags. Each channel = title + short blurb + cover + a set of tag/filter rules.
   - Build style: **Hybrid** — rules auto-fill the candidate list, you pin a few
     favorites to the top and write the blurb.
   - Starter channels that work with broad tags today:
     _Endodontic Excellence_ (and other specialties), _Build a Better Practice_
     (leadership/systems/hiring/marketing), _New Graduate_ (clinical fundamentals,
     career, associate contracts), _Dental Technology_ (AI, CBCT, digital workflows).

   - **Channel types:** _Editorial_ (curated by Andrei, tag-driven), _Smart_
     (auto-built from the onboarding quiz / specialty), and _Personal_ —
     **"My Bookmarks" is just a personal channel** the user curates by following
     shows. Same shelf, same UI, same player; the "new from your bookmarks" feed and
     a channel's "what's new" view are the same feature pointed at different inputs.

3. **Onboarding quiz / personalized front door** — a short first-visit quiz (no login
   needed, remembered in the browser) that builds an interest profile and assembles a
   personalized home page of channels:
   - _What's your specialty?_
   - _Where are you in your career?_
   - _What are you working on right now?_ (multi-select goals)
   - Each answer is a tag; each channel is a bundle of tags; the quiz picks which
     channels to show. Skippable and re-takeable.
   - Upgrades automatically to real per-user personalization once accounts ship.

## 🎯 Big Theme: "Why should you listen?" — outcome-driven recommendations  ⏸️ PARKED
_Parked (2026): infrastructure (episode tagging + onboarding quiz + goals) is built; the
user-facing feature is deferred, not cut. Revisit before deleting the groundwork._

Work backwards from what a dentist is trying to achieve. Every recommendation comes
with a compelling reason ("Listen to this *because* it'll help you introduce implants").
Sits directly on top of the tagging foundation above — the "reasons" ARE the goal/outcome
tags, written as benefits.

**Two pieces:**
1. **Outcome taxonomy** — the master list of "reasons a dentist would listen," which
   doubles as the goal dimension of the Tags field. Tag every resource with the
   outcomes it delivers, then any goal can surface "all the books/podcasts that help
   you do that" (e.g. pick "introduce implants" → see every matching resource).
2. **"Why you should listen" line** — short, compelling editorial micro-copy shown on
   the recommendation, tailored to the goal.

**Starter list of reasons (to refine together):**
- _Grow clinical services:_ introduce implants, start clear aligners/ortho, offer
  sedation/sleep, master molar endo / full-arch / digital same-day dentistry, handle
  complications with confidence.
- _Build a better business:_ scale before selling, increase profitability (EBITDA),
  improve case acceptance, get more new patients / marketing, open or acquire a
  second location.
- _People & leadership:_ find an amazing associate, hire and keep a great team,
  become a better leader.
- _Career & money:_ land your first job & negotiate your contract, plan your exit /
  sell your practice, build wealth outside the chair / tackle student debt.
- _Wellbeing:_ beat burnout & find balance.

## 🗄️ Big Theme: Episode Archive — a searchable database of every episode

Today episodes are fetched **live** (PodcastIndex / RSS) at query time — recent-only,
dependent on an outside API, and nothing is stored. This theme flips that: **harvest
every episode (title, description, date, link, show) from every podcast on the site and
store it**, kept fresh on a schedule. Owning the data (vs borrowing it live) is what
unlocks search, recommendations, and AI.

**Where it lives — a deliberate exception to our usual rule.** Normally content →
Airtable. But this archive is **thousands–tens of thousands of rows** and needs
full-text search, so it goes in **Supabase (Postgres)**, not Airtable. (Resources stay
in Airtable; only the episode archive is the exception.) Document this in CLAUDE.md when
built.

**Goal: all three of the below matter — build in this order (each builds on the last):**

1. **(A) Foundation — fast, complete search.** A `episodes` table in Supabase + a
   harvester that reads each podcast's full feed and upserts episodes, refreshed on a
   schedule (Vercel Cron). Replaces today's live search with instant search across a
   show's *entire* back-catalog, with no dependency on an outside API at query time.
2. **(B) Recommendations.** Tag/match episodes to the goals/outcomes taxonomy so we can
   surface "5 specific episodes that help you introduce implants" — episode-level fuel
   for the "Why should you listen?" and Channels features.
3. **(C) AI-powered discovery.** Semantic search ("find the episode about the cracked
   tooth that won't stop hurting"), auto-tagging episodes by topic/goal, and summaries —
   built on the stored text from (A).

**Honest notes:** it's a real build (harvester + scheduled refresh + search endpoint),
not a toggle; some RSS feeds only expose recent episodes, so full back-catalogs lean on
PodcastIndex; needs the scheduled refresh to stay current.

## 🪪 Big Theme: Claim Your Profile — owner-curated resource pages

Let resource/channel owners (podcasters, creators, course makers) **claim their listing**
and enrich it into a real profile — photos, featured episodes, notes from the creator,
their vision for dentistry. The "Spotify artist page" layer on top of the directory.

**⚠️ First-class principle — the editorial-integrity firewall.** The site's value is being
a *trusted, independent ranking* (the Wirecutter half of the brand). So owner content and
editorial content must stay strictly separated:
- **Owner's layer (they control):** bio, photos, featured episodes, creator note, vision —
  subjective/promotional, clearly labeled *"From the creator."*
- **Editorial layer (owners can NEVER touch):** the score, ranking, and any TDC review.
- Enforced by architecture, not just discipline: **owner content lives in Supabase**
  (theirs), the **objective record stays in Airtable** (yours) — owners never write to the
  scoring data. Visually distinguish "From the creator" sections from editorial scoring.
- **Score stays fully visible on claimed pages (DECIDED).** Transparency is the brand;
  revisit only if a creator pushes back.
- **Claiming does NOT directly raise the score (DECIDED).** Coupling the score to the
  owner's action would let the ranked influence their own rank — the exact thing that
  breaks trust. Instead, reward the engagement legitimately:
  - a **"Claimed / Active Creator" badge** (recognition + recency signal, no score change);
  - **presentation perks** — richer card / featured styling / tie-breaker (never rank);
  - **real recency via actual output** — the score's existing 15% Recency component should
    reflect genuine publishing cadence (new episodes/videos), not the act of claiming.
    Podcast cadence comes from the Episode Archive; **YouTube has no equivalent yet (gap —
    see below).**

**Claiming & moderation (DECIDED):**
- **Andrei manually approves every claim.** Comfortable at low volume, keeps quality high —
  and the personal interaction with creators is a feature, not a chore: it builds
  relationships with the most influential people in dental education (advocates + a direct
  line to the creators being ranked).
- Owner-submitted content (photos, free text) goes through a **review/approval step** before
  going live — same idea as the resource-submission queue.

**Fits what already exists:** per-resource pages (`pages/resource/[id].js`) become the
profile pages; Supabase accounts + Google sign-in already exist (claim = link owner account
to a resource); photos → Supabase Storage. Likely tables: `resource_claims`
(user_id + resource_id + status) and owner profile content.

**Phasing:**
1. **Claim + basics** — owner verifies (manual approval), can edit description/links. Proves
   the plumbing, low risk.
2. **Rich profile** — photos, featured episodes, creator note + "vision for dentistry." The
   magazine payoff.
3. **Creator value loop** — show owners simple stats ("dentists viewed your profile") to
   drive adoption; *much* later, optional premium/enhanced profile — with the iron rule that
   **paying never affects ranking, only presentation.**

**Adoption note:** usefulness scales with traffic — seed a few flagship profiles yourself and
personally invite marquee creators first; the Google Analytics now live gives the "X dentists
viewed your profile" hook that makes claiming worth a creator's time.

## 📱 Big Theme: Native mobile apps (iOS + Android) with CarPlay / Android Auto

The flagship "Dental Commute" experience: install on your phone, listen to & track your
favorite podcasts, and **collect CE on your commute** — with proper in-car playback.

**Reality check — what "CarPlay app" actually means.** CarPlay and Android Auto are NOT
standalone app platforms; they're projections of a **phone app**. So this means building a
**native iOS app** (CarPlay support) and a **native Android app** (Android Auto support).
Audio/podcast apps are a first-class, well-supported use case on both (ready-made templates).

**Honest scope — the biggest bet on the roadmap.** Everything today is a website (Next.js);
native apps are a different stack, require Apple Developer ($99/yr) + Google Play ($25)
accounts, app-store review, and two more surfaces to maintain. Almost a "second product" —
best sequenced AFTER the web foundations (player, CE tracking) prove the concept.

**What makes it tractable:**
- **Backend reuse:** the app is a new front-end on the **same Supabase backend** — accounts,
  bookmarks, Episode Archive, and CE-tracking logic all carry over. Web work isn't wasted.
- **Cross-platform:** build with **React Native / Expo** (one codebase → both iOS + Android);
  skills transfer from the existing JS/React web app, ~halving the effort vs. native-twice.
- **Supercharges CE:** a native app is the ideal place to precisely measure ≥80%-listened
  (even in-car / offline) and sync CE to the account — the app and CE feature reinforce each
  other.

**Relationship to the "Tesla"/web-player route (complementary, not the same):**
- _Web/Tesla route_ — responsive web player works only in cars with a full browser (Teslas,
  a few others); cheap, no app store; NOT CarPlay/Android Auto. A cheap beachhead.
- _Native app route (this)_ — reaches the mainstream car fleet (most modern cars have
  CarPlay/Android Auto), with steering-wheel/lock-screen controls, background audio, offline
  downloads. The full "real podcast app" experience.

## 🎓 Big Theme: CE Tracking & Certificates (podcast listening → documented CE) ✅ _Built._

Turn listening dentists are *already doing* into documented Continuing Education. Track
which episodes a user has listened to, mark an episode "listened" at **≥80% played**, and
let them generate a **PDF report** (dates/times/durations) and a **CE certificate**. CE is
mandatory and recurring for every licensed dentist, so this is a strong sign-up + retention
driver and a real differentiator. **Delivered:** `pages/my-listening.js` (listening log +
progress tracking) and `pages/ce-report.js` (PDF-ready CE report + certificate).

**⚠️ Hard dependency — the embedded player.** You can only measure "80% listened" if
playback happens **on the site**. So this is gated on the **embedded audio player** (see
Bookmarks theme). Listening on Apple/Spotify gives zero visibility. Sequence:
**embedded player → listening tracking → CE report/certificate.** Also uses accounts
(Supabase, exists) for per-user listening and episode durations (Episode Archive) to compute
the 80% threshold and CE *hours* (~60 min ≈ 1 CE hour).

**⚠️ Compliance reality — two tiers; start with #1:**
1. **Self-study CE documentation tool (DO FIRST, safe).** Most boards allow self-directed/
   self-study CE that the dentist self-reports and keeps records for. TDC = the best
   record-keeper: track listening, log dates/hours, produce a clean PDF + certificate the
   dentist files themselves. Requires **honest framing + a disclaimer** ("self-study CE
   tracking — verify acceptance with your licensing board"), NOT implying pre-accredited credit.
2. **Accredited CE provider (much bigger, future).** Automatically-recognized credit would
   require formal accreditation (US: AGD PACE / ADA CERP; Canada: provincial-body
   equivalents) — a real regulatory undertaking. Possible future ambition, not v1.

**Credibility booster (✂️ CUT — quiz & accreditation not being pursued):** a short **quiz/assessment per episode**
(pass to earn the certificate) — proves comprehension, reduces gaming, makes it feel like
real CE, and can draw questions from the Episode Archive text.

**Integrity:** the on-site 80%-played measurement is the anti-gaming mechanism (vs. someone
just claiming they listened).

**Deliverables:** a "My CE" dashboard/log; PDF report (date/time/title/duration); CE
certificate (learner name, episode, date, CE hours, provider line + disclaimer).

**Phasing:** (1) listening tracking [needs player] → (2) "My CE" log + PDF report →
(3) certificate → (4) optional quiz / accreditation exploration.

**Open decisions (to confirm with Andrei):**
- Position as **self-study documentation tool** (recommended) vs pursue **accreditation**.
- Confirm what **"Core 3 CE event"** means + which board/jurisdiction (e.g. Ontario/RCDSO,
  a US state, or general) so the regulatory wording is accurate.
- Per-episode vs batch certificates; include the quiz or not.

## 🤖 Big Theme: "AI Voice" disclosure — flag AI-narrated podcasts

Tell visitors upfront whether a podcast is narrated by a real human or an AI voice, via a
clear badge on the resource. AI-generated podcasts are proliferating and are often more
frustrating/less engaging to listen to, so upfront disclosure = listener trust (very
on-brand "Wirecutter honesty"). Purely informational — sets expectations.

**⚠️ Crux — false positives are dangerous.** Wrongly labeling a *real human's* podcast as
"AI" is insulting and potentially defamatory, and would alienate the exact creators we court
via Claim Your Profile. Guardrails:
- Distinguish **"suspected"** (bot guess) from **"confirmed"** (human-verified). Never publish
  a bald "AI voice" label off a bot hunch alone.
- **Human-gate it** — Andrei confirms before any public creator-facing label goes live (same
  pattern as claims/moderation).
- Let creators **contest / self-declare** through Claim Your Profile.

**Decision to make on purpose:** does the AI-voice tag only **disclose** (a badge), or also
**affect the score**? Recommendation: **disclose transparently first**; treat any score
impact as a separate, deliberate editorial decision (echoes the claim-vs-score debate).

**Detection — combine, cheapest first:**
1. **User reports** — add an "AI voice" reason to the existing report system
   (`resource_reports` / `components/ReportButton.js`). Cheap, reuses infra.
2. **YODA_Bot heuristic pre-pass** — telltale signals in metadata/description/cover art →
   a **"suspected"** flag for Andrei to confirm (not auto-published as fact).
3. **Audio analysis (later, ambitious)** — actually analyze episode audio for synthetic-voice
   artifacts. The accurate route, but expensive/heavier. Honest limit: text/metadata can only
   *suspect*; confirming AI *voice* really needs the audio.

**Infra fit:** an Airtable "Voice Type / AI Voice" field (value + confidence + source:
suspected/reported/confirmed); a badge on the resource card + page (like the Claimed badge);
reuse the report queue and YODA_Bot's existing research pass.

**Phasing:** (1) report reason + manual Andrei flag + badge → (2) bot heuristic "suspected"
pre-classification with human confirm → (3) optional audio analysis.

## 🧲 Big Theme: Community Home Page — a trace left by the last visitor

Make the home page feel *inhabited*: one visitor leaves something that the next visitor
sees, so the page quietly changes between visits. The emotional beat — "real dentists were
here, you're not alone" — builds community and serendipity. Inspired by Andrei's old
"fridge-magnet poetry" applet (rearrangeable word tiles that persisted for the next person).

**⚠️ The crux — the moderation firewall.** Anything one stranger leaves for the next is an
abuse risk. The trick (same as the fridge magnets): **constrain what can be expressed** so
it's expressive but *structurally* safe. Flavors, safest → riskiest:
1. **Fridge-magnet word poetry** — rearrange tiles from a **fixed, pre-approved word set**;
   safety comes from curated building blocks (can't spell something vile). Whimsical, on-brand.
   **Use an all-DENTAL word set** (e.g. molar, apex, occlusion, floss, gutta-percha, canine,
   plaque…) so the poetry is playful *and* in-world for dentists.
2. **Pin-a-resource (safest + most useful)** ✅ _Built._ — pin one resource from the catalog; home shows
   "📌 Pinned by a periodontist in Ohio" until the next person re-pins. Almost no unmoderated
   content (the pinned thing is already vetted); reinforces discovery. **Visual treatment:**
   a distinct **cork-board "Pinboard" section**, cards held up by little **thumbtacks** —
   deliberately different texture from the rest of the (magazine) layout.
3. **Free-text note (charming but risky)** — needs a moderation queue + AI profanity filter;
   can't show to the next visitor until approved. Ongoing work + real risk.

**Status (2026):** ✅ Thumbtack Pinboard **built**. ✂️ Dental-word magnet board **CUT** — the
Pinboard already delivers the community magic. (Free-text #3 not planned.)

**Safety layers (stack several):** constrained input (primary defense); **require sign-in to
contribute** (accountability/ban — accounts already exist); AI/profanity backstop; report
button + one-click admin removal; rate-limit (one change per user per day).

**Design decision:** single evolving artifact ("last visitor wins," like the fridge —
magical, easiest to moderate, RECOMMENDED) vs. an accumulating wall (richer, more to moderate).

**Backend:** tiny — one Supabase row holding current state (pinned resource id OR magnet
arrangement + who + when); public-read, writes gated by sign-in + safety layers.

**Build order:** start with the **thumbtack Pinboard (pin-a-resource)** — safe, useful,
reinforces the product — then the **dental-word fridge-magnet board** as the whimsy piece.
Both are wanted.

## 🎧 Big Theme: Bookmarks & embedded player ("podcast app" experience)

Let dentists follow shows and listen, the way they would in any podcast app —
building toward a hands-free, in-car experience.

- **Bookmark / follow podcasts — login required (DECIDED).** Bookmarks are tied to a
  user account, not the browser, so they survive cookie clearing and follow the person
  across devices. (Browser-only storage was rejected: bookmarks become useless once
  cookies reset.) ✅ _Built in PR #2 — Google sign-in + Supabase-backed bookmarks._
  Note: once Channels exist, **"My Bookmarks" is simply a personal channel** the user
  curates — same UI/player as editorial channels (see Channels above).
- **"New from your bookmarks" feed** — shows the latest episodes from only the shows
  a user follows. ✅ _Built in PR #2 (`/api/bookmark-feed`)._
- **Embedded audio player** ✅ _Built._ — play episodes directly on the website. A clean,
  responsive in-browser player (`components/PlayerBar.js`) with persistent playback across
  page navigation. Gets most of the way to the car use case since a Tesla just runs a web browser.
- **Cross-device / in-car ("Tesla") experience** — open the site in the car and your
  bookmarks are right there, press play for the road trip. Bookmarks are account-bound so
  they follow the person across devices; the embedded player is now built; remaining work
  is a car-friendly responsive layout.

**Infrastructure note:** accounts/bookmarks are powered by **Supabase** (hosted
database + Google OAuth), added in PR #2. This is the project's first real
user-accounts backend — the phased auth/voting work below now builds on it.

## 🔨 Now (actively working on / next up)

- **🔧 Harden & Fix — from the 2026-07-04 audits.** Four full audits (security, backend,
  AI bots, frontend) found several exploitable/critical issues. Master action list +
  batching plan in **`docs/audits/TRIAGE.md`**. Fixing in PRs: PR-1 critical security →
  PR-2 data integrity → PR-3 frontend → PR-4 hardening. **This jumps ahead of new features.**
  ⚠️ Until PR-2 ships, do NOT unpublish/merge podcasts in Airtable (harvester can delete CE data).
- Continue populating resources across remaining categories and themes.

## 📋 Next (planned, not started)

- **Consolidation / polish & QA pass (RECOMMENDED NEXT).** A lot shipped fast across
  parallel sessions — do a deliberate cohesion + end-to-end verification pass on the
  flagship flows (player → CE certificate, claim-a-profile, pinboard, onboarding quiz)
  before adding more features.
- **Refine the UI / reconcile the design north star.** The new carousel/card home page is a
  real departure from the "magazine, no card grids" aesthetic in CLAUDE.md — make it a
  conscious, cohesive look and update CLAUDE.md's design section to match reality.
- **Remaining home-page quick wins:** Trending this week, Clinical pearl of the day, Dynamic
  hero. (Editor's/Andrei's Pick is ✅ built.)
- **Dental software rankings** as a dedicated pillar.
- **YouTube recency feed** (parallel to the podcast Episode Archive) so the Recency Score is
  fair to video creators. `pages/api/youtube-stats.js` exists as a starting point.
- **Verify admin change-password.** The handler is implemented but rotates the Vercel env var
  via a `VERCEL_TOKEN`; confirm that token is set in Vercel (otherwise it errors) — a config
  check, not a rebuild.

## 💡 Later / Ideas (someday, unprioritized)

- **Native mobile apps (iOS + Android) with CarPlay / Android Auto** (see theme above) —
  the flagship in-car listen-and-earn-CE experience. Biggest bet on the roadmap; reuses the
  Supabase backend; build cross-platform (React Native/Expo).
- **Car-friendly in-car layout** — a responsive layout tuned for car browser screens (the
  player and bookmarks already sync across devices).
- **NPI-verified voting.** Basic voting/rating is built; add NPI verification so votes carry
  a verified-dentist weight. Later: Bayesian vote-confidence adjustment to prevent gaming.
- **"AI Voice" disclosure badge** (see theme above) — flag AI-narrated podcasts so listeners
  know what to expect. User reports + YODA_Bot "suspected" heuristic + human confirmation;
  disclose-first (score impact is a separate decision). Guard hard against false positives.
- **Episode recommendations / AI discovery (Episode Archive phases B–C)** — goal-based
  episode matching and semantic search, building on the podcast archive already live.
- **Channels (revisit).** The onboarding quiz + carousels/personal feed may already cover
  this in practice; revisit only if a distinct "curated channel" concept is still wanted.

## ✅ Done

_Reconciled 2026 against the live codebase — many items below were built by parallel
sessions faster than this doc was updated._

**Discovery & content**
- **Carousel home page** — vertical feed of horizontal category carousels
  (`components/Carousel.js`, `DiscoverFeed.js`, `PersonalFeed.js`, `home-feed`/`home-layout`).
- **Episode Archive (Phase A, podcasts)** — Supabase `episodes` cache + daily harvester cron
  + full-text search (`lib/harvester.js`, `/api/cron/harvest-episodes`, `/api/episode-search`).
- **"All Episodes" on resource pages** — browse/search a show's full back-catalog with pagination.
- **Onboarding quiz** — first-run specialty/career/goals quiz (`OnboardingModal`, quiz tables,
  admin quiz-options), feeding the personalized feed.
- **Editor's / Featured Picks (backend-managed)** — admin `featured` control + `FeaturedCards`.

**Accounts & user features**
- **User accounts** — Supabase + Google OAuth (NPI badge hook). _(PR #2)_
- **Bookmarks** — resource bookmarks + Saved page + "new from your bookmarks" feed _(PR #2)_;
  plus **episode-level bookmarks** (`episode_bookmarks`).
- **Delete account** — self-serve, cascade-deletes user data (`/api/delete-account`, wired into
  the profile page). **Privacy & Terms pages** added.
- **Embedded audio player** — persistent in-browser player (`components/PlayerBar.js`).
- **CE Tracking & Certificates** — ≥80%-played tracking, "My Listening" log
  (`pages/my-listening.js`) + CE report/certificate (`pages/ce-report.js`); self-study
  documentation tool with disclaimer; `listening_progress` table.
- **Voting / rating** — `RateButton` + votes system (`lib/votes-context`). _(NPI-weighting still to come.)_
- **Share button** — on resource and episode pages (`components/ShareButton.js`).

**Community & creators**
- **Thumbtack Pinboard** — community pin-a-resource (and pin-an-episode) board on the home page
  (`pins` table, `components/Pinboard.js` + `PinButton.js`).
- **Claim Your Profile** — owners claim + curate their listing (manual approval), with the
  editorial-integrity firewall (owner content in Supabase, scoring untouched). Creator pages
  (`/creator/[id]`, `/my-resources`), admin Claims tab, `resource_claims`/`resource_owner_content`.
- **Reports / moderation** — report button + admin reports queue (`resource_reports`).

**Scoring & admin**
- **YODA_Bot AI scoring engine** — automated composite scoring with an AI judge + nightly
  recompute crons + score rationale shown to owners (`lib/score-engine`, `score-judge`,
  `/api/cron/judge-scores`, `recompute-scores`, `scoring_runs`).
- **Admin tools** — submissions review + **Approve-all**, **Remove-duplicates** (`dedupes`),
  **Members view** (`users`), claims/edit-proposals, tagging, scoring status.
- **Google Analytics 4** (`G-NHEQGSKG9D`) via `next/script`. _(PR #5)_
- Resource submission modal (Turnstile CAPTCHA + AI parsing); Pediatric Dentistry specialty.

## ✂️ Cut / Parked (decided against or deferred)

- ✂️ **CUT — CE quiz per episode & CE accreditation.** Not pursuing; CE stays a self-study
  documentation tool.
- ✂️ **CUT — Dental-word fridge-magnet board.** The Pinboard already delivers the community
  magic; the magnet board is dropped.
- ⏸️ **PARKED — "Why should you listen?" (user-facing outcome recommendations).** Foundation
  (episode tagging + onboarding quiz + goals data) is already built, so finishing is cheap —
  revisit before deleting rather than throwing the groundwork away.
