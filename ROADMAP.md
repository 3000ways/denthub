# The Dental Commute — Roadmap

A running wish list of features and improvements. Plain English, no code required.
Move items between sections as work progresses. When an item is ready to actually
build, we can promote it to a GitHub Issue.

_Last updated: 2026-06-15_

---

## 🎯 Big Theme: Revamp the home page (more interactive, engaging, fresh)

The home page leans static and directory-like today. The goal is a home page that
feels alive on every visit and gives people things to do — and that eventually
personalizes itself to each dentist. Broken into quick wins (Next) and a larger
personalization system (Later).

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

1. **Tagging foundation (do first).** Add a free-form **Tags** field in Airtable and
   define a starter tag vocabulary, then tag existing resources. Tags span three kinds:
   - _Specialty_ — Endodontics, Ortho, Perio…
   - _Career stage_ — student, new grad, associate, owner, thinking-of-selling
   - _Goals / outcomes_ — selling your practice, increasing EBITDA, hiring an associate,
     finding a job/associate, investment advice, going digital (AI, CBCT, digital
     workflows), clinical fundamentals… (this is also the "reasons to listen" taxonomy —
     see the "Why should you listen?" theme below)
   - Note: channels only feel good once enough resources are tagged — a channel with
     2 items feels empty. This is the biggest content-work item.

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

## 🎯 Big Theme: "Why should you listen?" — outcome-driven recommendations

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
- **Embedded audio player** — play episodes directly on the website (later). A clean,
  responsive in-browser player gets most of the way to the car use case, since a
  Tesla just runs a web browser — no app store needed.
- **Cross-device / in-car ("Tesla") experience** — open the site in the car and your
  bookmarks are right there, press play for the road trip. Because bookmarks are
  account-bound (above), they already follow the person across devices; remaining work
  is the embedded player + a car-friendly responsive layout.

**Infrastructure note:** accounts/bookmarks are powered by **Supabase** (hosted
database + Google OAuth), added in PR #2. This is the project's first real
user-accounts backend — the phased auth/voting work below now builds on it.

## 🔨 Now (actively working on / next up)

- Continue populating resources across remaining categories and themes.

## 📋 Next (planned, not started)

- Home-page quick wins (see "Quick wins" above): Editor's/Andrei's Pick,
  Trending this week, Clinical pearl, Dynamic hero.
- Refine the UI toward the magazine aesthetic (white background, strong typography,
  minimal decoration — away from anything spreadsheet/card-grid-like).
- Build out dental software rankings as a dedicated pillar.

## 💡 Later / Ideas (someday, unprioritized)

- **Channels + personalized onboarding system** (see "The big idea" above) —
  tagging foundation → channels → onboarding quiz.
- **"Why should you listen?" outcome-driven recommendations** (see theme above) —
  builds on the same tagging foundation; brainstorm/finalize the reasons taxonomy.
- **Embedded audio player + car-friendly layout** for the in-car ("Tesla") experience
  (see "Bookmarks & embedded player" above). Bookmarks already sync across devices via
  accounts; this is the remaining playback/layout work.
- Extend the user-account system toward **voting**
  (now built on Supabase/Google sign-in → add NPI-verified voting).
- Bayesian vote confidence adjustment to prevent score gaming.

## ✅ Done

- **Login-required bookmarks** (Google sign-in + Supabase) — bookmark resources,
  Saved page, profile, and a "new from your bookmarks" episode feed. _(PR #2)_
- **User accounts foundation** via Supabase + Google OAuth (with NPI badge hook). _(PR #2)_
- Resource submission modal with Turnstile CAPTCHA and AI parsing.
- Pediatric Dentistry specialty added across the site.
