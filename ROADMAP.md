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
   - _Goals_ — selling your practice, increasing EBITDA, hiring an associate,
     finding a job/associate, investment advice, going digital (AI, CBCT, digital
     workflows), clinical fundamentals…
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

3. **Onboarding quiz / personalized front door** — a short first-visit quiz (no login
   needed, remembered in the browser) that builds an interest profile and assembles a
   personalized home page of channels:
   - _What's your specialty?_
   - _Where are you in your career?_
   - _What are you working on right now?_ (multi-select goals)
   - Each answer is a tag; each channel is a bundle of tags; the quiz picks which
     channels to show. Skippable and re-takeable.
   - Upgrades automatically to real per-user personalization once accounts ship.

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
- Implement a phased user account + voting system
  (launch as aggregator → Google/Apple sign-in → NPI-verified voting).
- Bayesian vote confidence adjustment to prevent score gaming.

## ✅ Done

- Resource submission modal with Turnstile CAPTCHA and AI parsing.
- Pediatric Dentistry specialty added across the site.
