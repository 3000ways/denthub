# Frontend Audit — 2026-07-04

**Scope:** all user-facing pages (`pages/*.js` excluding `pages/api/`) and `components/**`.
Reviewed for correctness, broken/empty/loading/error states, mobile + desktop responsiveness,
visual consistency vs. the design north star, accessibility, SEO/Open Graph, and performance.
**Method:** read-only code review (five parallel review passes over the home page, resource/episode
pages, signed-in pages, app shell/player, and the admin panel), with the top finding re-verified by hand.
No code was changed.

**Severity scale:** Critical = broken/unusable for real users · High = clearly bad UX or breaks on
common devices · Medium = inconsistency/polish · Low = nit. Findings the reviewers could not fully
confirm are marked **(uncertain)**.

> ⚠️ **Out-of-scope but urgent (backend, found in passing):** `pages/api/admin/featured.js` appears to
> have **no admin-auth check**, unlike every other admin route — anyone could GET/PATCH the home page's
> featured sections. Flagged as a separate task; verify and fix first.

---

## Design north star — where the look is drifting, and a cohesive direction

CLAUDE.md still says *magazine/Economist: white background, strong typography, reject card grids*, while
ROADMAP.md documents a deliberate shift to a Netflix/Spotify carousel feed. The carousels themselves are
fine — the problem is that **one page currently speaks two visual languages**:

- "What's New" wraps its carousels in the translucent-white magazine box with a Playfair,
  2px-black-underline heading ([index.js:871](pages/index.js:871)), while `DiscoverFeed`/`PersonalFeed`
  render identical carousels *bare* on the parchment with a small grey eyebrow label
  ([Carousel.js:32](components/Carousel.js:32), [DiscoverFeed.js:44](components/DiscoverFeed.js:44)).
  Stacked, the page reads half magazine spread, half streaming app.
- The background is `#f5f2eb` parchment with a polka-dot texture ([index.js:991](pages/index.js:991)),
  plus a corkboard Pinboard (intentional) and gradient teasers — a lot of texture for a page whose stated
  brief is "white, minimal decoration."
- Small constants drift per file: brand green is `#0F6E56` everywhere except `#2D6A4F` in
  [Community.js:7](components/Community.js:7) and [AuthModal.js:6](components/AuthModal.js:6); borders
  `#e8e8e8` vs `#e5e7eb`; the `Inter` font stack differs across files; CTA buttons vary in size/padding
  between the resource hero, episode page, and creator page; hero-card opacity is 0.55 / 0.6 / 0.7 on
  resource / episode / creator pages.

**Recommended direction:** keep the "magazine that happens to scroll like Spotify" hybrid, but make it
deliberate: (1) pick ONE section-frame treatment (the magazine box + Playfair heading is the stronger,
more on-brand one) and apply it to every carousel block; (2) create a tiny `lib/theme.js` with the green,
borders, font stack, and button recipe, and sweep the 8+ files that hard-code them; (3) update CLAUDE.md's
design section so the north star and the site agree. This is mostly consolidation, not redesign.

---

## Critical

### 1. Stale page state when navigating between resource pages (wrong logo, wrong bio, wrong episode list)
- **SEVERITY:** Critical
- **Where:** [pages/_app.js:20](pages/_app.js:20), [pages/resource/[id].js:232](pages/resource/[id].js:232), [pages/resource/[id].js:254](pages/resource/[id].js:254), [components/AllEpisodes.js:16-30](components/AllEpisodes.js:16)
- **What the user experiences:** Click a "You Might Also Like" link on a resource page and the next
  resource renders with the previous one's data: `logoSrc` is seeded once from props and never reset, so
  resource B shows resource A's logo; the owner-content effect early-returns on `!data`, so A's "From the
  creator" bio/vision and featured episodes stay on screen for B; and `AllEpisodes` seeds
  `episodes`/`total`/`offset` from props with mount-only effects, so B's page shows **A's entire episode
  list** — and "Load More" then appends B's episodes under A's (a mixed list from two different shows).
  Verified by hand: `_app.js` renders `<Component {...pageProps} />` with no `key`, so Next.js reuses the
  mounted component across same-route navigations.
- **Suggested fix:** key the page body (or at minimum `<AllEpisodes>`) by `record.id`
  (e.g. `<PageInner key={record.id} …/>`), and reset `logoSrc`/owner content in an effect on `record.id`.

---

## High

### 2. Fake demo resources render as real rankings when Airtable fails or returns empty
- **SEVERITY:** High
- **Where:** [pages/index.js:68-75](pages/index.js:68), [pages/index.js:772-773](pages/index.js:772)
- **What the user experiences:** if both the build-time and client-side Airtable fetches fail, the home
  page silently shows six hardcoded fake resources with made-up scores (86–94) as if they were real
  rankings — clicks open real third-party sites under fabricated scores. The `isDemo` flag is computed and
  **never used**. For a trust-based ranking site this is a reputational bug, not just a technical one.
- **Suggested fix:** show a visible "sample data / temporarily unavailable" banner when `isDemo`, or
  render an error state instead of the demo set.

### 3. Fixed player bar covers the bottom of every page on mobile
- **SEVERITY:** High
- **Where:** [pages/_app.js:19](pages/_app.js:19), [components/PlayerBar.js:64-180](components/PlayerBar.js:64)
- **What the user experiences:** the shell reserves only `paddingBottom: 80` (sized for the 72px desktop
  bar), but the mobile player layout is ~130–160px tall (scrubber + artwork row + transport row +
  safe-area inset). With an episode loaded, the last ~60–80px of every page — footer links, last list
  rows — sit permanently under the player and can't be scrolled into view or tapped.
- **Suggested fix:** branch the compensation by `isMobile` (~160px), or have PlayerBar report its real
  height to the shell.

### 4. Mobile logo overlaps the category tabs and search whenever a filter is active
- **SEVERITY:** High (uncertain — verified in code, not visually)
- **Where:** [pages/index.js:1006-1013](pages/index.js:1006), [pages/index.js:1080](pages/index.js:1080)
- **What the user experiences:** on mobile the logo is a 135px-tall absolutely-positioned link
  (`zIndex: 101`) escaping the 56px nav bar; the hero's `paddingTop: 84` compensates — but the hero only
  renders when no filter is active. Tap any category tab / specialty pill / type a search, and the tab row
  and search bar slide up underneath the logo, which covers them and intercepts taps.
- **Suggested fix:** keep the top padding whenever `isMobile`, not only on the unfiltered home view.

### 5. Keyboard and screen-reader users cannot open list rows or start playback (site-wide)
- **SEVERITY:** High
- **Where:** [pages/index.js:249](pages/index.js:249), [pages/index.js:304](pages/index.js:304), [pages/index.js:922](pages/index.js:922), [pages/index.js:1451](pages/index.js:1451), [components/SpotlightCard.js:82](components/SpotlightCard.js:82), [components/EpisodeCard.js:75](components/EpisodeCard.js:75), [pages/index.js:462](pages/index.js:462), [pages/saved.js:153-158](pages/saved.js:153), [pages/my-listening.js:216-218](pages/my-listening.js:216)
- **What the user experiences:** every navigating list row (Editor's Pick, Essentials, New this week, the
  ranked list, saved resources) and every "click artwork to play" control is a `<div onClick>` with no
  `role`, `tabIndex`, key handler, or focus style. Keyboard users cannot open resources or start playback
  from cards at all; on `saved.js` the row has no other link inside, so saved resources are unreachable.
- **Suggested fix:** use `<Link>`/`<button>` (or add `role`, `tabIndex={0}`, Enter/Space handlers) plus a
  visible focus state; buttons inside rows already `stopPropagation` correctly.

### 6. Audio player controls are not accessible
- **SEVERITY:** High
- **Where:** [components/PlayerBar.js:132-142](components/PlayerBar.js:132), [components/PlayerBar.js:261-271](components/PlayerBar.js:261) (play/pause), [components/PlayerBar.js:73-79](components/PlayerBar.js:73), [components/PlayerBar.js:324-328](components/PlayerBar.js:324) (scrubber)
- **What the user experiences:** the play/pause button's only content is the `⏸`/`▶` glyph with no
  `aria-label` (screen readers announce "black right-pointing triangle, button"); the scrubber is a
  click-only `<div>` with no `role="slider"`, no `tabIndex`, no arrow-key seeking — keyboard users cannot
  seek at all.
- **Suggested fix:** `aria-label={isPlaying ? 'Pause' : 'Play'}`; make the scrubber a native
  `<input type="range">` or a `role="slider"` element with `aria-valuenow/min/max` and arrow-key handlers.

### 7. Account dropdown menu is unreachable by keyboard (and flaky for slow clicks)
- **SEVERITY:** High
- **Where:** [components/SiteNav.js:83](components/SiteNav.js:83)
- **What the user experiences:** the menu closes via `onBlur={() => setTimeout(…, 150)}` on the trigger.
  Tabbing from the trigger into the menu blurs the trigger, and 150ms later the menu unmounts under the
  user's focus — "My Listening / Saved / Profile / Sign out" can't be reached without a mouse. A mouse
  press held longer than 150ms also loses the click.
- **Suggested fix:** close on `focusout` of the whole container (checking `relatedTarget`) or an
  outside-click listener, plus Escape-to-close.

### 8. Modals and popovers lack dialog semantics and keyboard dismissal
- **SEVERITY:** High
- **Where:** [components/AuthModal.js:9-43](components/AuthModal.js:9), [components/ReportButton.js:120-196](components/ReportButton.js:120), [components/ClaimButton.js:77-121](components/ClaimButton.js:77), [components/PinButton.js:134-182](components/PinButton.js:134)
- **What the user experiences:** none have `role="dialog"`/`aria-modal`, a focus trap, initial focus, or
  Escape-to-close. The sign-in modal's *only* dismissal is clicking the backdrop (no ✕ button), so a
  keyboard user who triggers it is stuck; the Claim and Pin popovers have **no outside-click or Escape
  close at all** (Claim can only be dismissed via its Cancel button); screen readers don't announce any
  of them.
- **Suggested fix:** shared dialog wrapper: `role="dialog" aria-modal="true"`, visible close button,
  Escape handler, focus moved in on open and restored on close.

### 9. Desktop player bar overflows at tablet/small-laptop widths (641–950px)
- **SEVERITY:** High
- **Where:** [components/PlayerBar.js:186-334](components/PlayerBar.js:186)
- **What the user experiences:** the mobile breakpoint is 640px, but the desktop row's fixed-width pieces
  (182px art padding, ~200px transport, save/share, "✓ Mark listened", 220px scrubber, timestamps) sum to
  roughly 950px, all `flexShrink: 0` except the title. Between ~641–950px the title collapses to zero and
  the scrubber/buttons spill past the right edge of the bar.
- **Suggested fix:** raise the mobile breakpoint, make the scrubber width flexible, and/or hide the
  labeled buttons at mid widths.

### 10. Mobile player transport row clips at 375px
- **SEVERITY:** High (uncertain by a few px)
- **Where:** [components/PlayerBar.js:124-179](components/PlayerBar.js:124)
- **What the user experiences:** the bottom row (`↺15`, play, `15↻`, speed, bookmark, share,
  "✓ Mark Listened", gaps, padding, no `flexWrap`) totals ~390–400px — at iPhone width the right edge
  ("Mark Listened") gets cut off.
- **Suggested fix:** allow wrapping, use an icon-only "✓" on mobile, or move share into an overflow menu.

### 11. The whole responsive system is one JS-driven 640px breakpoint — desktop flash on phones, no tablet tier
- **SEVERITY:** High
- **Where:** [pages/index.js:588-594](pages/index.js:588) (pattern repeated in [components/EpisodeCard.js:17-23](components/EpisodeCard.js:17), [components/SiteNav.js:14](components/SiteNav.js:14), [components/PlayerBar.js:32](components/PlayerBar.js:32), and most pages)
- **What the user experiences:** `isMobile` starts `false`/`null` and is set in an effect, and the home
  page is statically generated — so every phone visit first paints the **desktop** layout (437px logo,
  54px headline, 4–6-column grids, wide player row) and then jumps to mobile: a large visible layout shift
  on every page load. There is also no tablet tier: at 641–900px the desktop layout renders cramped —
  `repeat(6, 1fr)` featured grids ([FeaturedCards.js:141](components/FeaturedCards.js:141)), the
  `marginLeft: '44%'` hero text ([index.js:1088](pages/index.js:1088)), the absolute 437px logo
  ([index.js:1084](pages/index.js:1084)).
- **Suggested fix:** move layout-critical breakpoints to CSS media queries (styled-jsx or a global
  stylesheet); at minimum add a tablet tier and hydration-safe detection.

### 12. YouTube "Recent Videos" grid is a fixed 3 columns on mobile
- **SEVERITY:** High
- **Where:** [pages/resource/[id].js:428](pages/resource/[id].js:428)
- **What the user experiences:** `repeat(3, 1fr)` gives ~97px-wide cards at 375px — titles show 2–3
  words, dates truncate, tap targets are tiny. `isMobile` is already computed and used on the same
  container for padding.
- **Suggested fix:** `repeat(isMobile ? 2 : 3, 1fr)` (or 1 column).

### 13. Resource-page hero has fixed padding on mobile, unlike every other section
- **SEVERITY:** High
- **Where:** [pages/resource/[id].js:325-327](pages/resource/[id].js:325)
- **What the user experiences:** the hero keeps `padding: '32px'` while sibling sections switch to
  `'18px 14px'` on mobile; at 375px the 80px logo + padding leaves ~155px for the 26px Playfair `<h1>`,
  so long show names wrap 3–4 lines and the score pill/chips get squeezed.
- **Suggested fix:** `padding: isMobile ? '20px 14px' : '32px'`, and consider a smaller logo on mobile.

### 14. Search-term highlighting misses every other match
- **SEVERITY:** High
- **Where:** [pages/index.js:92-97](pages/index.js:92)
- **What the user experiences:** the highlight regex is created with the `g` flag and then reused with
  `.test()` in a loop; a global regex is stateful (`lastIndex` advances), so consecutive matches
  alternately fail and lose their yellow highlight in search results (used at
  [index.js:1462](pages/index.js:1462), [index.js:1468](pages/index.js:1468)).
- **Suggested fix:** test with a non-global copy, or rely on the split invariant (odd indices are matches).

### 15. Signed-in users see a flash of the "Sign in to track your listening" pitch on My Listening
- **SEVERITY:** High
- **Where:** [pages/my-listening.js:29](pages/my-listening.js:29), [pages/my-listening.js:118](pages/my-listening.js:118)
- **What the user experiences:** the page never reads the auth `loading` flag, so while Supabase resolves
  the session every signed-in visitor briefly sees the full signed-out sign-in screen, which then swaps to
  their history. (`ce-report.js` and `saved.js` gate this correctly.)
- **Suggested fix:** destructure `loading` from `useAuth()` and gate the signed-out branch on
  `!authLoading && !user`.

### 16. Profile form silently wipes unsaved edits when the tab refocuses
- **SEVERITY:** High
- **Where:** [pages/profile.js:91-104](pages/profile.js:91), [lib/auth-context.js:24-28](lib/auth-context.js:24)
- **What the user experiences:** the `useEffect([profile])` reseeds the form whenever `profile` gets a new
  object reference, and `onAuthStateChange` refetches the profile on token refresh / tab refocus. A user
  mid-edit who switches tabs (e.g. to copy an avatar URL) and comes back finds their in-progress edits
  reset to the saved values with no warning.
- **Suggested fix:** seed the form once (a `hydratedRef`, or key the effect on `profile?.id`).

### 17. Submitting a resource claim fails silently
- **SEVERITY:** High
- **Where:** [components/ClaimButton.js:44-54](components/ClaimButton.js:44)
- **What the user experiences:** `submit()` only handles success; on any insert error (RLS rejection,
  duplicate claim, network) the button simply returns to "Submit claim" with no message — a creator
  believes nothing happened, retries, gives up. Same pattern with lower stakes in
  [PinButton.js:83](components/PinButton.js:83) and [creator/[id].js:119](pages/creator/[id].js:119).
- **Suggested fix:** set an error state and show a short inline message on failure.

### 18. Admin: "+ Feature" throws a ReferenceError — the Featured list never refreshes
- **SEVERITY:** High (admin-only)
- **Where:** [pages/admin/index.js:1959](pages/admin/index.js:1959)
- **What the admin experiences:** `addFeatured` calls `setSearchResults([])`, but `searchResults` is a
  derived const (line 1947), not state — the call throws inside the async handler, so
  `loadFeatured(section)` on the same line never runs and the newly featured resource doesn't appear until
  switching section tabs. (The leftover empty `doSearch()` at line 1951 confirms a refactor remnant.)
- **Suggested fix:** delete the `setSearchResults([])` call.

### 19. Admin: Approve/Reject removes the submission card even when the API call fails
- **SEVERITY:** High (admin-only, data-integrity illusion)
- **Where:** [pages/admin/index.js:244-248](pages/admin/index.js:244)
- **What the admin experiences:** `act()` never checks `r.ok`; if the Airtable PATCH fails, the card
  vanishes and the submission looks approved/published — but it's still Pending and silently reappears on
  the next load.
- **Suggested fix:** check `r.ok` / parse `{error}` before `onRemove`; show an error otherwise.

### 20. Admin: "Publish all" has no confirmation and clears the queue even on server failure
- **SEVERITY:** High (admin-only)
- **Where:** [pages/admin/index.js:446-453](pages/admin/index.js:446)
- **What the admin experiences:** one accidental click publishes every pending submission (including
  unvetted AI-agent finds) live, with no `confirm()`; and since `approveAll` never checks `r.ok`, a 500
  still runs `setItems([])` — an empty queue while nothing was actually approved.
- **Suggested fix:** add a confirm dialog; only clear items on a successful response.

---

## Medium

### 21. Sitemap omits all episode pages and /browse
- **SEVERITY:** Medium
- **Where:** [pages/sitemap.xml.js:14-17](pages/sitemap.xml.js:14), [pages/sitemap.xml.js:75-81](pages/sitemap.xml.js:75)
- **What the user experiences:** only `/`, `/about`, and `/resource/[id]` are emitted. The 38,000+ public
  `/episode/[id]` pages — the site's SEO moat — and `/browse` are invisible to crawlers except via
  internal links.
- **Suggested fix:** add `/browse`; emit a sitemap index with paginated episode sitemaps from Supabase
  (50k-URL-per-file limit).

### 22. No `_document.js` → `<html>` has no `lang` attribute
- **SEVERITY:** Medium
- **Where:** repo-wide (no `pages/_document.js`; no `lang=` anywhere in `pages/`)
- **What the user experiences:** screen readers guess the page language; Lighthouse/SEO tools flag it.
- **Suggested fix:** add a minimal `pages/_document.js` with `<Html lang="en">` — also the right home for
  the font `<link>`s and a global favicon.

### 23. Favicon is wired on only 3 pages
- **SEVERITY:** Medium
- **Where:** [pages/index.js:969](pages/index.js:969), [pages/episode/[id].js:133](pages/episode/[id].js:133), [pages/resource/[id].js:302](pages/resource/[id].js:302)
- **What the user experiences:** `/about`, `/privacy`, `/terms`, `/browse`, `/saved`, `/profile`, etc. show
  the browser-default icon; there's also no `favicon.ico`/apple-touch-icon fallback.
- **Suggested fix:** move the icon link into `_app.js`/`_document.js` once; delete per-page copies.

### 24. GA4 likely misses SPA page views
- **SEVERITY:** Medium (uncertain)
- **Where:** [pages/_app.js:44-59](pages/_app.js:44)
- **What the user experiences (owner):** `gtag('config', …)` fires once and there's no
  `routeChangeComplete` listener, so client-side navigations are only counted if the GA4 property's
  enhanced measurement covers history changes. If not, analytics only counts landing pages.
- **Suggested fix:** add a `router.events` page_view sender, or verify the GA4 setting.

### 25. All scrollbars hidden globally in WebKit browsers
- **SEVERITY:** Medium
- **Where:** [pages/_app.js:41](pages/_app.js:41)
- **What the user experiences:** `::-webkit-scrollbar { display: none }` removes the scrollbar on the whole
  page and every overflowing container in Chrome/Safari/Edge — no scroll affordance or position indicator
  anywhere.
- **Suggested fix:** scope the rule to the horizontal carousel strips it was meant for.

### 26. Desktop floating player artwork covers the bottom-left of every page
- **SEVERITY:** Medium
- **Where:** [components/PlayerBar.js:214-219](components/PlayerBar.js:214), [pages/_app.js:19](pages/_app.js:19)
- **What the user experiences:** the 150×150 artwork rises ~78px above the 72px bar, but the shell only
  reserves 80px — a ~150×70px region of content at the bottom-left is permanently covered and unclickable
  while an episode is loaded.
- **Suggested fix:** reserve enough height for the art, or shrink/inset it.

### 27. `play()` race: saved-position restore can seek the wrong episode
- **SEVERITY:** Medium
- **Where:** [lib/player-context.js:152-165](lib/player-context.js:152)
- **What the user experiences:** after setting `audio.src` for episode A, the code awaits a Supabase query
  then sets `currentTime`. Start episode B during that await and A's late-resolving query seeks B's audio
  to A's saved position.
- **Suggested fix:** after the await, bail if `audio.src` no longer matches episode A (request token).

### 28. "Mark Listened" silently does nothing when signed out
- **SEVERITY:** Medium
- **Where:** [components/PlayerBar.js:168](components/PlayerBar.js:168), [components/PlayerBar.js:305](components/PlayerBar.js:305), [lib/player-context.js:182](lib/player-context.js:182)
- **What the user experiences:** `markListened` early-returns without a user; unlike the bookmark button
  (which opens the sign-in modal), clicking gives zero feedback.
- **Suggested fix:** open the existing `SignInModal` when `!user`, matching the bookmark button.

### 29. Hydration mismatch when arriving with `?submit=1`
- **SEVERITY:** Medium
- **Where:** [pages/index.js:627](pages/index.js:627)
- **What the user experiences:** the modal-open state is initialized from `window.location.search`, so the
  client's first render differs from the server HTML — a React hydration error and re-render on that
  entry path.
- **Suggested fix:** initialize `false` and open the modal in an effect once `router.isReady`.

### 30. ~180 lines of dead JSX (plus dead components) shipped on the home page
- **SEVERITY:** Medium
- **Where:** [pages/index.js:1258-1435](pages/index.js:1258) (`{false && typeGroups.map(...)}`), plus `TrendingCard` (:218), `trending`/`top2` (:811, :842), `VoteButtons` (:126 — localStorage-only fake counts), `ExpandedEpisodeRow` (:377), unused `CommunitySection` import (:14)
- **What the user experiences:** bundle bloat and misleading code for future edits; the fake `VoteButtons`
  would be a trust problem if ever re-enabled.
- **Suggested fix:** delete the `false &&` block and its orphaned helpers.

### 31. Three stats fetches fire on every home load but mostly feed dead code
- **SEVERITY:** Medium
- **Where:** [pages/index.js:706-708](pages/index.js:706)
- **What the user experiences:** `/api/youtube-stats`, `/api/podcast-stats`, `/api/book-stats` are fetched
  on every visit, yet their data is only read inside the dead block and the filtered ranked list.
- **Suggested fix:** fetch lazily when a filter first activates.

### 32. Open Library book covers return a blank image, defeating the 📚 fallback
- **SEVERITY:** Medium (uncertain)
- **Where:** [components/FeaturedBooks.js:14-15](components/FeaturedBooks.js:14), [components/BooksForYou.js:20](components/BooksForYou.js:20)
- **What the user experiences:** title-based cover lookups that miss return a 1×1 blank GIF with HTTP 200,
  so `onError` never fires — empty white cards instead of the fallback icon.
- **Suggested fix:** append `?default=false` so misses 404 and trigger `onError`.

### 33. Theme constants drift across files (two greens, two borders, two font stacks, three button recipes)
- **SEVERITY:** Medium
- **Where:** [components/Community.js:7-8](components/Community.js:7), [components/AuthModal.js:6](components/AuthModal.js:6) (`#2D6A4F` vs site-wide `#0F6E56`); font stack variants in [pages/browse.js](pages/browse.js), [pages/my-resources.js](pages/my-resources.js), [components/CEHoursBadge.js](components/CEHoursBadge.js); CTA variants at [pages/resource/[id].js:358](pages/resource/[id].js:358), [pages/episode/[id].js:100](pages/episode/[id].js:100), [pages/creator/[id].js:247](pages/creator/[id].js:247); hero-card opacity 0.55/0.6/0.7 across resource/episode/creator pages
- **What the user experiences:** visibly mismatched greens between adjacent UI (onboarding pills vs
  identical profile pills), inconsistent buttons and card tones between sibling pages.
- **Suggested fix:** a shared `lib/theme.js` (colors, font stack, button recipe); sweep the hard-coded
  copies. See the design-direction section above.

### 34. Two different components are both named `EpisodeCard`
- **SEVERITY:** Medium
- **Where:** [pages/index.js:443-533](pages/index.js:443) (local) vs [components/EpisodeCard.js](components/EpisodeCard.js)
- **What the user experiences:** episode search results on the home page look different (fonts, layout, no
  bookmark button) from the identical episodes on a resource page. There's also a duplicate `display` key
  at [index.js:487-488](pages/index.js:487).
- **Suggested fix:** consolidate on the shared component.

### 35. Section chrome clashes: magazine box vs bare carousels on one page
- **SEVERITY:** Medium
- **Where:** [pages/index.js:871-893](pages/index.js:871) vs [components/Carousel.js:32-46](components/Carousel.js:32), [components/DiscoverFeed.js:44-53](components/DiscoverFeed.js:44)
- **What the user experiences:** the same card lane appears framed two different ways on one page — the
  incoherent half-magazine/half-streaming mix. (Details and recommended direction in the design section.)
- **Suggested fix:** one section-frame treatment for all carousel blocks.

### 36. Score tooltip is hover-only — invisible on touch and keyboard
- **SEVERITY:** Medium
- **Where:** [pages/index.js:194](pages/index.js:194)
- **What the user experiences:** the score-breakdown tooltip opens only on `onMouseEnter` — mobile users
  (the "commute" audience) and keyboard users can never see the breakdown on the home page.
- **Suggested fix:** make the badge a button toggling on click/focus.

### 37. No semantic headings below the `<h1>` anywhere
- **SEVERITY:** Medium
- **Where:** home: [pages/index.js:280](pages/index.js:280), [pages/index.js:296](pages/index.js:296), [components/Carousel.js:38](components/Carousel.js:38), [components/FeaturedBooks.js:84](components/FeaturedBooks.js:84), [components/Pinboard.js:196](components/Pinboard.js:196); resource/episode: [pages/resource/[id].js:427](pages/resource/[id].js:427), [pages/resource/[id].js:509-524](pages/resource/[id].js:509), [pages/episode/[id].js:197](pages/episode/[id].js:197)
- **What the user experiences:** all section titles are styled `<div>`s — screen-reader users get one h1
  then a flat page; search engines lose the outline on the primary SEO surfaces.
- **Suggested fix:** `<h2>` elements with the existing styles.

### 38. Widespread low-contrast grey text fails WCAG AA
- **SEVERITY:** Medium
- **Where:** e.g. [pages/resource/[id].js:444](pages/resource/[id].js:444) (`#bbb` dates), [components/AllEpisodes.js:139](components/AllEpisodes.js:139), [pages/episode/[id].js:163](pages/episode/[id].js:163), [pages/my-resources.js:78](pages/my-resources.js:78), [components/ReportButton.js:113](components/ReportButton.js:113) (≈1.9:1 on parchment)
- **What the user experiences:** dates, counts, and empty states render at ~2:1 contrast (AA requires
  4.5:1) — hard to read for low-vision users, and these carry real information.
- **Suggested fix:** floor informational grey text at ~`#767676`.

### 39. Score-breakdown grid is 2 fixed columns on mobile
- **SEVERITY:** Medium
- **Where:** [pages/resource/[id].js:510](pages/resource/[id].js:510), [pages/creator/[id].js:185](pages/creator/[id].js:185)
- **What the user experiences:** at 375px each column is ~140px, so labels like "Community Score (25%)"
  wrap awkwardly against their values.
- **Suggested fix:** `gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'`.

### 40. Claim/Pin popovers can overflow the viewport on small screens
- **SEVERITY:** Medium (uncertain)
- **Where:** [components/ClaimButton.js:78-82](components/ClaimButton.js:78) (320px wide, right edge lands off-screen at ≤375px), [components/PinButton.js:136-138](components/PinButton.js:136)
- **What the user experiences:** the popover's right side is clipped off-screen on narrow phones; neither
  clamps to the viewport the way `ShareButton` does ([ShareButton.js:83](components/ShareButton.js:83)).
- **Suggested fix:** reuse ShareButton's position-clamping approach.

### 41. A score of exactly 0 renders as "no score"
- **SEVERITY:** Medium (uncertain that 0 occurs in practice)
- **Where:** [pages/resource/[id].js:275](pages/resource/[id].js:275), [pages/resource/[id].js:528](pages/resource/[id].js:528)
- **What the user experiences:** `f['Final Score'] ? … : null` treats 0 as missing — hides the ★ pill and
  the JSON-LD rating.
- **Suggested fix:** `f['Final Score'] != null`.

### 42. Turnstile loader polls forever if the script is blocked
- **SEVERITY:** Medium
- **Where:** [components/ReportButton.js:21-36](components/ReportButton.js:21), [components/ReportButton.js:80](components/ReportButton.js:80)
- **What the user experiences:** with `challenges.cloudflare.com` blocked (ad blockers, corporate
  networks), the interval spins indefinitely and the only feedback on submit is "Please complete the
  verification." next to an empty widget box.
- **Suggested fix:** time out the loader with a "verification couldn't load" message; clear the interval
  on unmount.

### 43. "Email a colleague" opens a blank popup window
- **SEVERITY:** Medium
- **Where:** [components/ShareButton.js:92](components/ShareButton.js:92), [components/ShareButton.js:106](components/ShareButton.js:106)
- **What the user experiences:** `window.open(mailto…, '_blank', …)` opens an empty stub window alongside
  the mail client on Chrome/Firefox.
- **Suggested fix:** special-case the email row to `window.location.href = href`.

### 44. Blank white screen during auth/claim checks on creator pages
- **SEVERITY:** Medium
- **Where:** [pages/creator/[id].js:138](pages/creator/[id].js:138), [pages/my-resources.js:48](pages/my-resources.js:48)
- **What the user experiences:** `return null` while auth/claim status resolves — a flash (or seconds on
  slow connections) of a completely empty page with no nav.
- **Suggested fix:** render `SiteNav` + a small loading state during the gate.

### 45. Episode descriptions lose all paragraph breaks; HTML entities show literally
- **SEVERITY:** Medium
- **Where:** [pages/episode/[id].js:24](pages/episode/[id].js:24) vs [pages/episode/[id].js:183](pages/episode/[id].js:183)
- **What the user experiences:** `stripHtml` collapses newlines to spaces, so the `whiteSpace: 'pre-line'`
  on the renderer is dead code — long show notes are one unbroken wall of text; `&lt;`/numeric entities
  aren't decoded and show literally.
- **Suggested fix:** convert `</p>`/`<br>` to `\n` before stripping; collapse only spaces/tabs; decode
  entities.

### 46. /browse has no meta description, OG tags, or canonical despite being an SEO page
- **SEVERITY:** Medium
- **Where:** [pages/browse.js:97](pages/browse.js:97) (comment at :17 says server-rendered "for SEO")
- **What the user experiences:** bare title in SERPs, no share preview.
- **Suggested fix:** add `meta description`, OG tags, and a canonical URL per tag.

### 47. Profile and My Listening are indexable account pages
- **SEVERITY:** Medium
- **Where:** [pages/profile.js:156](pages/profile.js:156), [pages/my-listening.js:83-85](pages/my-listening.js:83)
- **What the user experiences:** private, signed-in-only pages can be indexed; `saved.js` and
  `ce-report.js` already have `noindex`.
- **Suggested fix:** add `<meta name="robots" content="noindex" />` to both.

### 48. CE report overflows horizontally on mobile
- **SEVERITY:** Medium
- **Where:** [pages/ce-report.js:138-142](pages/ce-report.js:138), [pages/ce-report.js:221-231](pages/ce-report.js:221)
- **What the user experiences:** fixed 48px padding + `nowrap` table columns with no `overflow-x` wrapper
  → horizontal page scroll at 375px (the report is reachable from phones via My Listening).
- **Suggested fix:** reduce padding at small widths; wrap the table in `overflow-x: auto`.

### 49. Site footer prints onto the CE report PDF
- **SEVERITY:** Medium
- **Where:** [pages/ce-report.js:260](pages/ce-report.js:260)
- **What the user experiences:** the About/Privacy/Terms footer appears as a trailing block on the printed
  document meant for dental-board record-keeping (the toolbar correctly uses `no-print`; the footer was
  missed).
- **Suggested fix:** wrap `<Footer/>` in a `no-print` container on this page.

### 50. Saved page flashes "You haven't saved anything yet" for episode-only savers
- **SEVERITY:** Medium
- **Where:** [pages/saved.js:96](pages/saved.js:96), [pages/saved.js:138](pages/saved.js:138)
- **What the user experiences:** the empty-state gate ignores episode-bookmark loading, so a user with only
  saved episodes sees the empty state, then the Saved Episodes section pops in.
- **Suggested fix:** include `epBookmarksLoaded` (and the episode-details fetch) in `ready`.

### 51. Account deletion treats API failure as success
- **SEVERITY:** Medium
- **Where:** [pages/profile.js:131-147](pages/profile.js:131)
- **What the user experiences:** `/api/delete-account` is called in a swallowing try/catch with no `res.ok`
  check; if the auth-user deletion fails, the user is signed out and told nothing — email still
  registered, profile row already gone (half-deleted account).
- **Suggested fix:** check `res.ok`, surface an error instead of signing out; let the DB cascades do the
  row cleanup (the client-side deletes are redundant).

### 52. Onboarding quiz answers can be silently discarded
- **SEVERITY:** Medium
- **Where:** [components/AuthModal.js:87-96](components/AuthModal.js:87)
- **What the user experiences:** `save()` ignores `updateProfile`'s failure return and closes anyway —
  picks are lost with no feedback and the modal reappears next session.
- **Suggested fix:** check the result; show an inline error and reset `saving` on failure.

### 53. Keyboard-inoperable saved-resource rows (worst case of finding 5)
- **SEVERITY:** Medium (rolled into finding 5's fix)
- **Where:** [pages/saved.js:153-158](pages/saved.js:153)
- **What the user experiences:** the whole row is a `div onClick={router.push}` with no other link inside —
  saved resources are entirely unreachable by keyboard.
- **Suggested fix:** make the row a `<Link>`.

### 54. Admin: several flows misreport failure as success or show false empty states
- **SEVERITY:** Medium (admin-only, grouped)
- **Where:** Dedup "Keep" dismisses + caches to localStorage even when archiving failed
  ([admin/index.js:1428-1452](pages/admin/index.js:1428)); Review Queue / Claims API errors render as
  "Queue is empty" ([admin/index.js:436-442](pages/admin/index.js:436), [:1110-1127](pages/admin/index.js:1110));
  Delete resource ignores the API result ([admin/index.js:556-561](pages/admin/index.js:556)); Home Layout
  "Publish" can publish a stale draft and swallows network errors
  ([admin/index.js:2741-2759](pages/admin/index.js:2741)); Run Research tab is silently unusable if its
  plan fetch fails ([admin/index.js:780-795](pages/admin/index.js:780)).
- **What the admin experiences:** actions look done when they failed; failed tabs look empty instead of
  broken.
- **Suggested fix:** check `r.ok`/`Array.isArray` everywhere; error + retry states per tab; only persist
  dismissals after confirmed success.

---

## Low

### 55. Footer sits outside the beige page background on Privacy/Terms
- **SEVERITY:** Low — [pages/privacy.js:128-129](pages/privacy.js:128), [pages/terms.js:127-128](pages/terms.js:127)
- White strip under the beige page (About renders the footer inside the wrapper). Move `<Footer>` inside.

### 56. No active-link state in the nav
- **SEVERITY:** Low — [components/SiteNav.js](components/SiteNav.js)
- No `aria-current`/visual current-page treatment. Compare `useRouter().pathname`.

### 57. Contact email and og:image inconsistencies on About/Privacy/Terms
- **SEVERITY:** Low — [pages/privacy.js:124](pages/privacy.js:124), [pages/terms.js:123](pages/terms.js:123) (personal Gmail vs branded address on [about.js:188](pages/about.js:188)); [pages/about.js:55](pages/about.js:55) uses `logo.png` as og:image instead of the purpose-made `og-image.jpg`.
- Standardize on the branded email and `og-image.jpg`.

### 58. Media Session seek can set `currentTime = NaN`
- **SEVERITY:** Low — [lib/player-context.js:39-41](lib/player-context.js:39)
- `audio.duration` is `NaN` before metadata loads. Guard with `isFinite`.

### 59. Resource logos squish square artwork into a 0.72:1 portrait
- **SEVERITY:** Low — [pages/index.js:120](pages/index.js:120)
- Book-cover shape applied to square podcast/YouTube art (sides cropped). Shape by resource type.

### 60. Per-card `resize` listeners in EpisodeCard
- **SEVERITY:** Low — [components/EpisodeCard.js:17-23](components/EpisodeCard.js:17)
- 20 search results = 20 window listeners. Accept `isMobile` as a prop (callers already have it).

### 61. Carousel injects a duplicate `<style>` tag per instance
- **SEVERITY:** Low — [components/Carousel.js:29](components/Carousel.js:29)
- Hoist the `.tdc-hscroll` rule to a global style.

### 62. Search placeholders read oddly before data loads
- **SEVERITY:** Low — [pages/index.js:1163](pages/index.js:1163) ("Search 0 episodes…" until stats load), [pages/index.js:1151](pages/index.js:1151) (count shrinks as you type).
- Fall back to static copy until counts exist.

### 63. Images lack intrinsic dimensions (CLS) and use plain `<img>`
- **SEVERITY:** Low — throughout ([SpotlightCard.js:59](components/SpotlightCard.js:59), [FeaturedCards.js:59](components/FeaturedCards.js:59), hero logos [index.js:1084](pages/index.js:1084))
- Artwork pops in with layout shift; the 437px hero logo is a large unoptimized PNG. Consider `next/image`
  eventually.

### 64. Community comment submit clears the input even on silent failure
- **SEVERITY:** Low — [components/Community.js:45-54](components/Community.js:45)
- Check the returned `error` before clearing.

### 65. Profile CE stats disagree with My Listening / CE report
- **SEVERITY:** Low — [pages/profile.js:71-86](pages/profile.js:71)
- Profile sums only `duration_seconds` without the `episodes.duration_seconds` fallback the other two
  pages use — numbers disagree. Use the same fallback.

### 66. saved.js episode refetch contradicts its comment and can race
- **SEVERITY:** Low — [pages/saved.js:80-90](pages/saved.js:80)
- Every toggle triggers a refetch anyway; no cancellation flag. Drop `episodeBookmarkIds.size` from deps;
  add a cleanup flag.

### 67. Onboarding modal can exceed short viewports with no scroll
- **SEVERITY:** Low (uncertain) — [components/AuthModal.js:11-14](components/AuthModal.js:11)
- Add `maxHeight: '90vh', overflowY: 'auto'` to the card.

### 68. Toggle controls lack state semantics
- **SEVERITY:** Low — [pages/my-listening.js:166-175](pages/my-listening.js:166) (filter tabs), [pages/profile.js:242-252](pages/profile.js:242) + AuthModal pills
- Add `aria-pressed={active}`.

### 69. BookmarkButton mutates the DOM directly for hover
- **SEVERITY:** Low — [components/BookmarkButton.js:69-70](components/BookmarkButton.js:69)
- `querySelector('path').setAttribute(...)` breaks if the child structure changes. Use state/CSS.

### 70. Avatar fallback can loop on error
- **SEVERITY:** Low — [pages/profile.js:179-184](pages/profile.js:179)
- If ui-avatars.com also fails, `onError` re-fires. Clear `onerror` after the first swap.

### 71. Saved page downloads the entire Resources table for a few bookmarks
- **SEVERITY:** Low — [pages/saved.js:69-75](pages/saved.js:69)
- Fine at current scale; plan a filtered fetch as the catalog grows.

### 72. My Listening renders the full unvirtualized history
- **SEVERITY:** Low — [pages/my-listening.js:203](pages/my-listening.js:203)
- Consider paging past ~100 rows.

### 73. Duplicate `display` keys in style objects
- **SEVERITY:** Low — [pages/my-listening.js:234-236](pages/my-listening.js:234), [pages/index.js:487-488](pages/index.js:487)
- The second key silently wins; delete the dead first one.

### 74. CE report auto-print may fire before the logo loads
- **SEVERITY:** Low — [pages/ce-report.js:60-65](pages/ce-report.js:60)
- Fixed 600ms delay can print a blank header on slow connections. Wait for the image's `onload`.

### 75. "Export CE Report" shows with zero completed episodes
- **SEVERITY:** Low — [pages/my-listening.js:107-114](pages/my-listening.js:107)
- Leads to a dead-end page. Gate on having at least one completed row.

### 76. Saved page header count ignores episode saves
- **SEVERITY:** Low — [pages/saved.js:115-117](pages/saved.js:115)
- "0 resources bookmarked" above a list of saved episodes reads as broken. Include episodes in the line.

### 77. RateButton icon variant: duplicate `padding` key kills its horizontal padding
- **SEVERITY:** Low — [components/RateButton.js:67](components/RateButton.js:67), [:70](components/RateButton.js:70)
- `padding: 0` overrides `padding: '0 10px'`; the vote count sits flush against the edges. Delete line 70's.

### 78. AllEpisodes refresh-on-view compares a stale `total` closure
- **SEVERITY:** Low — [components/AllEpisodes.js:61-80](components/AllEpisodes.js:61)
- Harmless today; can needlessly reload page 1 and discard "Load More" results after a user re-fetch.

### 79. JSON-LD `Review` of a generic `Thing` won't qualify for rich results
- **SEVERITY:** Low — [pages/resource/[id].js:303-312](pages/resource/[id].js:303)
- Use a typed item (`PodcastSeries`, `Book`) with `AggregateRating`; episode pages have no
  `PodcastEpisode` JSON-LD at all.

### 80. Small touch targets
- **SEVERITY:** Low — [components/ShareButton.js:126](components/ShareButton.js:126) (34×30px), tiny "×" clears in [components/AllEpisodes.js:173-176](components/AllEpisodes.js:173) and [pages/browse.js:121-122](pages/browse.js:121), "Unpin" text link [components/PinButton.js:104-108](components/PinButton.js:104)
- Below the ~44px touch minimum.

### 81. `fmtDur` shows "0 min" for sub-minute episodes
- **SEVERITY:** Low — [pages/episode/[id].js:32-37](pages/episode/[id].js:32)
- Floor at "1 min" or show seconds.

### 82. Dead code / dead props
- **SEVERITY:** Low — [pages/resource/[id].js:228](pages/resource/[id].js:228) (`showOnboarding` never set true), [components/CEHoursBadge.js:13](components/CEHoursBadge.js:13) (unused `isMobile` prop), [pages/resource/[id].js:226](pages/resource/[id].js:226) (unused `profile`); admin: dead `sortAsc` state ([admin/index.js:696](pages/admin/index.js:696)), dead field-ID fallbacks ([admin/index.js:2002-2003](pages/admin/index.js:2002))
- Delete.

### 83. CEHoursBadge sums client-side over an uncapped row fetch
- **SEVERITY:** Low — [components/CEHoursBadge.js:20-27](components/CEHoursBadge.js:20)
- Supabase silently caps at 1000 rows — heavy listeners will see an undercount. Use a `sum()` aggregate.

### 84. Index-based React keys on paginated/remote lists
- **SEVERITY:** Low — [pages/browse.js:128](pages/browse.js:128) (index fallback can collide across pages), [pages/resource/[id].js:430](pages/resource/[id].js:430) (`key={i}` when `videoId` exists), admin research feed ([admin/index.js:897](pages/admin/index.js:897))
- Use stable ids.

### 85. Creator featured-episode picker only shows the newest 30 episodes
- **SEVERITY:** Low — [pages/creator/[id].js:100](pages/creator/[id].js:100)
- Owners of large shows can't feature older classics. Add search/pagination to the picker.

### 86. Admin: login can get stuck on "Checking…" forever; auth probe over-fetches
- **SEVERITY:** Low (admin-only) — [pages/admin/index.js:2386-2392](pages/admin/index.js:2386) (no try/catch around login fetch), [pages/admin/index.js:3166-3171](pages/admin/index.js:3166) (`r.ok || r.status !== 401` treats a 500 as logged-in, and the probe downloads the whole resources table as an auth check)
- Wrap in try/catch/finally; check only `r.ok` or add a lightweight auth endpoint.

---

## Verified as fine (checked, no finding)

- Home page SEO/OG is solid: title, description, canonical, OG + Twitter tags, JSON-LD; `og-image.jpg`,
  `favicon.svg`, logos all exist in `public/`.
- `getStaticProps` on home, resource, and episode pages: correct Airtable offset-cursor pagination and
  proper `notFound` handling for bad ids/unpublished resources.
- Audio element lifecycle in `lib/player-context.js`: single `Audio()` instance, listeners torn down,
  progress-sync interval cleaned up, playbackRate re-applied per episode.
- Buttons inside clickable rows correctly `stopPropagation`; carousel arrows are real `<button>`s with
  `aria-label`s; fetch effects in the feed components all have cancellation flags.
- `sitemap.xml.js` domain, XML escaping, and graceful degradation are correct (coverage gaps are finding
  21); `robots.txt` is sane.
- CE report dates have no timezone bug (`completed_at` is a full ISO timestamp; local rendering correct).
