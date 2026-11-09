# Journal Briefings — build plan

**Status:** building. Week 1 shipped 2026-11-08 (PR #101); week 2 (drafting, render job, publish, admin controls) in PR; all 14 clusters harvesting nightly. Scripts are template-built with no language model (short versions come from each paper's Conclusions), so `ANTHROPIC_API_KEY` is not needed for the weekly show. First shows: *Endodontics This Week* and *Orthodontics This Week*.

**What it is, in one paragraph.** Every Monday, The Dental Commute publishes a short podcast per specialty that briefs you on the week's new papers from that specialty's top three journals. A host voice (Grace) welcomes, lists the headlines, hands off to a reader voice (Adrian) for each paper, and closes. For most papers Adrian gives a summary in the show's own words (what the study did, who it studied, what it found, numbers included) and Grace then quotes the authors' conclusion, in their words, explicitly attributed. When a paper is open access under a Creative Commons licence, Adrian reads the published abstract as published. The episode plays on the site with a *Next paper* button and on Apple, Spotify and every podcast app through our own RSS feed. The narration is synthetic and says so, and the show states that it is independent of the journals it covers.

> **Format decision (2026-11-08): the hybrid format.** The original design read every abstract verbatim. An independent legal review (Canadian fair dealing, US fair use, worldwide distribution, the actual Elsevier/Wiley/Kare policies, PubMed/Crossref terms, Creative Commons, the AI-processing question, and the partnership route) concluded that verbatim reading of all-rights-reserved abstracts was legally arguable in Canada but untested, weak in the US, and exposed to Spotify's automated takedowns of recited text, while the facts, numbers and conclusions of a paper belong to nobody. Andrei chose the hybrid: **own-words summary + one attributed verbatim conclusion sentence for all-rights-reserved papers; verbatim abstract for CC BY / CC BY-NC papers; verbatim with strip-only cleaning for CC ND papers**. The review itself is kept off the public repo on purpose (it is the owner's own risk assessment). Its practical rules are in "Rules that protect us" below.

---

## Decisions already made

| Topic | Decision |
|---|---|
| Name | **"Endodontics This Week"**, "Orthodontics This Week", … one show per specialty. Publisher line: *The Dental Commute*. Grace's opener: "Welcome to Endodontics This Week, from The Dental Commute." |
| Cadence | Every Monday, early morning Eastern. Journals publish online continuously (PubMed data: JOE 4–5 papers/week, three-journal endo cluster ~8.5/week), so weekly is right. |
| Sources | Top three journals per specialty (table below). Everything comes from PubMed, by the date PubMed received the article, not the issue date. Letters, editorials, comments and errata are excluded by publication type. |
| Length cap | **Eight papers covered in depth** per briefing (summary + quoted conclusion, or the full abstract when the licence allows; ≈18–22 min at normal speed). Every remaining paper of the week gets a 30-second slot: title, journal and the authors' quoted conclusion. Nothing rolls to the next week. |
| Read mode per paper | Decided at prepare time from the paper's licence (Unpaywall, publisher-hosted copy only): `verbatim` (CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, CC0), `verbatim_nd` (CC BY-ND, CC BY-NC-ND: no rewording of statistics at render), `hybrid` (everything else, incl. unknown), `quote_only` (a summary that failed its checks twice — the paper gets title + quoted conclusion, never a bad summary). Stored on `articles.read_mode`. |
| Summaries | Written by a language model (Perplexity `sonar-pro`, search off, abstract fenced as untrusted data) in `lib/briefing-summary.js`, then checked **mechanically** before they are ever spoken: no run of 8+ consecutive words shared with the abstract, every number in the summary present in the abstract (spelled-out numbers accepted), sane length, no links. Two attempts, then `quote_only`. Cost per summary is recorded (`summary_meta.cents`) and rolled into the episode cost line. Tone: a well-read colleague describing a paper over coffee — approachable, precise with numbers, never joking about findings. |
| Sounding human | Owner tone: professional, slightly humorous, down to earth. Phrasing rotates deterministically per week (hand-offs, reader cues, host links, quote leads); titles spoken short with the study type in words; summary writer has a style brief, a banned-word list and a six-number guideline enforced by the checker; dental pronunciation list seeded (admin-editable). |
| Music | An original signature generated from code (no licence); owner's pick: the "big brass" opener (E-flat major, 120 bpm, horn-style riff over drums). Opening sting, quiet bed under the welcome, a page-turn chime before each paper, outro under the close. Mixed by the Monday render job; chapters follow the music timeline. `scripts/make-music.mjs`, `lib/briefing-music.js`. |
| Hear it first | `review_required` per show (default on): Monday renders, stops at `rendered`, emails Andrei; he listens and presses Publish in the admin. Plus a Listen button on any drafted episode (and the intro) that renders through the shared audio cache, so Monday's render is free for those clips. |
| Firewall | The show carries **no ads, no sponsor reads, no affiliate links** in episodes, show notes or feed, and says in every episode and in the notes that it is independent of and not affiliated with any journal or publisher. Adding sponsorship later is a legal decision, not a product one. |
| Ordering (weekly) | Mechanical and explainable: study design tier (systematic reviews and meta-analyses → trials → other clinical studies → narrative/scoping reviews → lab and other research → case reports), then journal (society journal first), with a variety rule so no eight studies of one kind run back to back. **No AI relevance judge** for the weekly: predicting influence on publication day is guesswork; measured influence is the job of the specials below. |
| Specials (retrospective) | Inside each specialty feed, a few times a year: **Best of [year]** (ranked by NIH iCite Relative Citation Ratio, with journal/society award winners featured), a quarterly **Trending** (Altmetric attention + early citations), and a **Classics** series (most-cited papers of all time per topic). Selection is by published metrics, shown on the page with source and date pulled. See "Specials" below. |
| Empty weeks | If nothing new, no episode. Never publish a "nothing this week" episode. |
| First episode | **An introduction, written with Andrei, not a briefing.** Episode 0 of every show is Grace alone, about two minutes: what the show is, which three journals it covers, that it comes out every Monday, how each paper is covered (our summary + the authors' quoted conclusion; full abstract when open access), that narration is synthetic and the show is independent, how to skip to the next paper, and where the links live. Tone: professional, slightly humorous, down to earth. Saved per show in the admin (`briefing_shows.intro_script`); nothing publishes until it is saved and **Launch show** is pressed. Marked `itunes:episodeType = trailer` so Apple and Spotify show it as the show's preview. Rendered once when a show is switched on. |
| Voices | Soniox `tts-rt-v2`. **Grace** hosts, **Adrian** reads. Normal speed at render; listeners use the player's 1×–2× control. (Voice test: claude.ai artifact "Journal Briefing Voice Test".) |
| Script | Grace's lines are the only generated text, written to a fixed template. "Short version" lines come from the paper's Conclusions. Abstracts are never paraphrased in audio, but they are **cleaned for the ear** (below). |
| Spoken journal names | Journals are read by short spoken names, kept in the `journals` table and editable in the admin: "the J-O-E", "the I-E-J", "the European Endo Journal", "A-J-O-D-O", "the Angle", "the E-J-O". Full names appear in the show notes and on the page, never in the audio. |
| Never read aloud | URLs, DOIs, PubMed IDs, trial and review registration numbers (NCT…, CRD…, ISRCTN…), bracketed citation numbers, email addresses, funding and grant codes. Stripped from abstracts before rendering, or replaced by a short phrase where the sentence needs one ("registered in PROSPERO"). Links live on the episode page and in the show notes. |
| Disclosure | One sentence in every episode, spoken by Grace after the welcome, plus the show description, plus the site's existing 🤖 AI-narrated badge (our shows are set Voice Type = AI-generated, Voice Status = Confirmed, so the same gate applies to us). |
| Skipping | Chapters per paper. *Next paper* / *Previous paper* in the site player, wired to the phone's media keys so headphone and steering-wheel buttons skip papers. Chapters also embedded in the podcast feed. |
| Podcast feed | Abstract readings and host script only. Full readings of open-access papers stay on the site, where the licence is checked per article. |
| Read to me (members' own subscriptions) | Separate, later phase, after legal review. Not in this plan. |
| Autonomy | Fully automatic on cron. A failed quality check skips the week and alerts Andrei rather than publishing something doubtful. |

### Cleaning text for the ear (`lib/speech-clean.js`, pure, unit-tested)

Applied to every abstract section and every host line before it goes to Soniox:

- **Strip:** URLs, DOIs (`10.xxxx/…`), PMIDs, registration identifiers (NCT, CRD/PROSPERO, ISRCTN, ChiCTR, UMIN), grant and funding codes, email addresses, bracketed citation markers (`[12]`, `(3,4)`), trademark and copyright symbols.
- **Rewrite:** `n = 20` → "n equals 20"; `p < 0.05` → "p less than point oh five"; `95% CI 0.8–1.4` → "95 percent confidence interval 0.8 to 1.4"; `±` → "plus or minus"; `≥` / `≤` → "at least" / "at most"; unit abbreviations (mm, mL, Ncm, kVp) to words; `vs.` → "versus"; en-dash ranges to "to".
- **Pronunciation dictionary:** dental terms the engine gets wrong, maintained in the admin and applied as replacements (starts empty; grows as Andrei hears mistakes).
- **Keep:** every number that carries meaning (effect sizes, intervals, percentages, sample sizes), author surnames, drug and material names.
- **Section labels** ("Methods.", "Results.") are spoken as headings with a short pause.

The cleaner is deterministic and logged per segment (what was removed), so a listener complaint can be traced.

### Journal clusters (checked against PubMed, 8 weeks ending 2026-11-08, non-paper types excluded)

| Specialty | Journals (PubMed abbreviation) | Papers/week |
|---|---|---|
| Endodontics | J Endod · Int Endod J · Eur Endod J | 8.5 |
| Orthodontics | Am J Orthod Dentofacial Orthop · Angle Orthod · Eur J Orthod | 3.1 (Angle arrives in batches) |
| Periodontics | J Periodontol · J Clin Periodontol · Clin Oral Implants Res | 8.8 |
| Prosthodontics | J Prosthet Dent · J Prosthodont · Int J Prosthodont | 13.6 |
| Oral & maxillofacial surgery | J Oral Maxillofac Surg · Int J Oral Maxillofac Surg · Br J Oral Maxillofac Surg | 10.2 |
| Pediatric dentistry | Pediatr Dent · Int J Paediatr Dent · Eur Arch Paediatr Dent | 5.9 |
| Oral & maxillofacial radiology | Dentomaxillofac Radiol · Oral Surg Oral Med Oral Pathol Oral Radiol · Oral Radiol | 5.8 |
| Oral & maxillofacial pathology | J Oral Pathol Med · Oral Surg Oral Med Oral Pathol Oral Radiol · Head Neck Pathol | 7.2 |
| Oral medicine | Oral Dis · J Oral Pathol Med · Oral Surg Oral Med Oral Pathol Oral Radiol | 12.5 |
| Orofacial pain | J Oral Facial Pain Headache · J Oral Rehabil · Cranio | 12.9 |
| Dental anesthesiology | Anesth Prog · J Dent Anesth Pain Med · Paediatr Anaesth (dental keyword filter) | 3.9 |
| Dental public health | Community Dent Oral Epidemiol · J Public Health Dent · Community Dent Health | 5.8 |
| General dentistry | J Am Dent Assoc · J Dent Res · J Dent (needs a tighter relevance filter; J Dent alone is 13/week) | 20.5 |
| Implant dentistry (topic, not a specialty) | Clin Oral Implants Res · Int J Oral Maxillofac Implants · Clin Implant Dent Relat Res | 5.5 |

A journal shared by several clusters (OOOO, J Oral Pathol Med) routes each paper to one briefing by topic tag, so nothing is read twice.

---

## How it works (plain English)

1. **Every night**, a job asks PubMed for anything new in the 40-odd journals above, keeps real papers, stores title, authors, abstract (by section), publication type, DOI and link, and asks Unpaywall whether a free legal full-text copy exists.
2. **Sunday night**, for each specialty, the job gathers the week's papers, ranks them (systematic reviews and meta-analyses, then randomized trials, then other clinical studies, then lab studies, then case reports), takes the top eight, and writes Grace's script from the template. The script is saved as a draft.
3. **Monday early morning**, the audio is rendered: each script segment and each abstract section goes to Soniox (cached by text + voice, so an abstract that appears in two clusters is paid for once), the pieces are joined, chapter times are measured, and the MP3 is uploaded to storage.
4. **Publish, automatically**: an episode row is created in the existing `episodes` archive under the specialty's show, the podcast RSS feed updates, the home-page "Journal Briefings" row shows it, and Andrei gets the usual owner alert with a link and the episode's cost. **No human gate.** The whole chain runs on cron jobs; the admin exists to watch it, fix a script and re-render, or pull an episode after the fact, never to approve it beforehand. Safety comes from automatic checks in steps 2 and 3 (template conformance, "short version" grounded in Conclusions, every segment rendered, duration within bounds); a briefing that fails a check is skipped for that week and Andrei is alerted, which is the one case that needs a human.

---

## Architecture

### Data (Supabase, new migration `0025_journal_briefings.sql`)

- `journals` — one row per journal: `pubmed_abbr`, display name, **`spoken_name`** (what Grace says), society, homepage, `cluster` (specialty key), `active`.
- `articles` — one row per paper: `pmid` (unique), `doi`, `journal_id`, `title`, `authors` (text[]), `abstract` (jsonb: `[{label, text}]`), `pub_types` (text[]), `received_at` (PubMed edat), `published_at`, `url`, `oa_status` (`none` / `open` / `manuscript`), `oa_url`, `oa_license`, `cluster`, `rank_tier` (1–5 from pub type), `briefing_id` (null until used), `status` (`new` / `scheduled` / `read` / `headline_only`).
- `briefings` — one row per episode: `cluster`, `week_of` (Monday date), `status` (`draft` / `rendered` / `approved` / `published` / `skipped`), `script` (jsonb segments: `{speaker, text, article_id?, kind}`), `article_ids` (ordered), `headline_ids`, `audio_url`, `duration_seconds`, `chapters` (jsonb: `[{title, start, article_id}]`), `episode_id` → `episodes.id`, `rendered_at`, `published_at`, `cost_cents` (total), `cost_breakdown` (jsonb: Soniox chars/seconds/cents per voice, LLM tokens/cents, cached segments and their saved cents).
- `audio_cache` — `text_hash` (sha256 of voice + speed + text) → `audio_url`, `duration_seconds`, `bytes`, `chars`, `cost_cents` (what it cost the first time; reuse is counted as saved). Avoids re-rendering shared abstracts and makes re-publishing a corrected script cheap.
- **Shows reuse the existing tables.** Each specialty show is a `resources` row (Type Podcast, Status Published, `voice_type = AI-generated`, `voice_status = Confirmed`, `source = tdc_original`) with its own RSS Feed URL pointing at our feed. Each briefing is an `episodes` row (`show_resource_id` = that show), which is what makes the player, Save, progress, My Listening, search, the specialty picker and "Fits your commute" work with no new plumbing. The harvester skips `tdc_original` shows (we write those rows ourselves).

### Jobs

| Job | Where it runs | When | Why there |
|---|---|---|---|
| **Harvest articles** | Vercel cron `/api/cron/journals-harvest` | Daily 03:10 ET | Small, fast, fits the 60 s cap. PubMed E-utilities with an NCBI API key (10 requests/s). Unpaywall by DOI (needs a contact email param: `hello@thedentalcommute.com`). |
| **Draft scripts** | Vercel cron `/api/cron/journals-draft` | Sunday 22:00 ET | One LLM call per cluster (Claude API, `claude-sonnet-5-5`) with a strict template and the papers' titles, authors, journals and Conclusions. Output is checked: every "short version" must quote or closely paraphrase the Conclusions; anything else is rejected and re-run. |
| **Render + publish** | **GitHub Actions** workflow `render-briefings.yml` (cron) | Monday 05:00 ET, automatic; also on demand | Rendering a 25-minute episode is ~40 Soniox calls and several minutes of wall time, beyond Vercel's limit. Actions has `ffmpeg`, no time pressure, free minutes, and secrets storage. It cleans text, renders, measures, computes cost, uploads, publishes, and alerts, calling our admin API to read drafts and write results. |
| **Feed** | Vercel route `/api/podcast/[cluster].xml` | On request, CDN-cached 15 min | Generated from `briefings` + `episodes`; iTunes namespace, chapters via Podcasting 2.0 `<podcast:chapters>` JSON. |

### Storage and delivery

- **Audio:** Cloudflare R2 bucket, public via `audio.thedentalcommute.com` (Cloudflare already holds the DNS). Zero egress cost matters once a show has subscribers. Supabase Storage is the fallback if R2 setup stalls.
- **Chapters:** JSON file beside each MP3 plus the `chapters` column, so our player and podcast apps read the same timestamps.

### Site surfaces

- **Home:** "Journal Briefings" row under *Fits your commute*: newest briefing per show (ordered by the visitor's "I'm a…" pick), then latest single-abstract readings. Mock-up: claude.ai Design canvas "Journal Briefings".
- **Briefing page** `/briefing/[id]`: player with chapters, the paper list with access status (Open access full read / Abstract / link to publisher), Grace's script, the disclosure.
- **Journals hub** `/journals`: the shows, this week's briefing per show, every article with status and filters, subscribe buttons (Apple, Spotify, RSS).
- **Player** (`PlayerBar`, `player-context`): *Next paper* / *Previous paper* when the current episode has chapters; MediaSession `nexttrack` / `previoustrack` handlers; chapter title shown under the episode title. Speed control already exists.
- **Admin › Briefings (new tab):** what ran and what is scheduled, per week and cluster; script viewer/editor with per-segment re-render and re-publish; *Unpublish* and *Pause show*; the **cost panel** (below); PubMed harvest status per journal; the spoken-name table and pronunciation dictionary. Same pattern as the Scoring and AI Voice tabs.
- **Analytics:** `briefing_play`, `briefing_next_paper`, `briefing_complete`, `briefing_subscribe_click` via `lib/analytics.js`.

### Podcast distribution

- One feed per show. Artwork 3000×3000 per show in the site's green/cream system with the specialty name large. Category: Health & Fitness › Medicine; secondary Science. `explicit = false`. Author and owner: The Dental Commute, `hello@thedentalcommute.com`.
- Submit each feed to Apple Podcasts Connect, Spotify for Creators, YouTube Music and Amazon once the first episode is live. Apple review takes days, so submit endo in week 3.
- Show description carries the disclosure and a line inviting listeners to the site for links and full readings.

---

## Phases

> **Status 2026-11-08:** weeks 1–3 shipped (harvest → draft → prepare → render → review → publish; feeds, artwork, hub, episode pages, home row, player chapters, admin distribution panel). Remaining: Apple/Spotify submission (manual, checklist in the admin), the metrics job and retrospective specials.

**Week 1 — data.** Migration; `lib/journals.js` (the cluster table above); harvest cron; Unpaywall lookup; admin harvest-status panel. *Done when:* all 40 journals harvest nightly and the last eight weeks are backfilled.

**Week 2 — the first episode.** Script template and draft cron; render workflow in GitHub Actions; audio cache; R2 bucket and domain; manual trigger from the admin; the first *Endodontics This Week* rendered end to end and reviewed by Andrei. *Done when:* an episode plays in the site player with working chapters.

**Week 3 — surfaces and feed.** Home row, briefing page, Journals hub, player chapter buttons, RSS feed, artwork, Apple and Spotify submission for endo; orthodontics turned on. *Done when:* "Endodontics This Week" is listed in Apple Podcasts.

**Week 4 — scale + metrics.** All clusters already harvest (Andrei switched every specialty on 2026-11-08); shows go live two per week as their trailers render, with Andrei listening to each first episode as it goes out. Analytics events; cost dashboard checked against the Soniox console. The `paper_metrics` job and the three-year backfill start here so metrics accumulate before the first special.

**Phase 5 — specials.** First *Classics* episodes (evergreen back catalogue) as soon as the metrics backfill lands; first *Trending* at the end of the first full quarter; first *Best of* in January.

---

## Specials — the papers that mattered (retrospective, metric-driven)

The weekly briefing is the news; the specials are the verdict. Influence is measured, not guessed, so these episodes run on a lag and say so.

**Sources (all free)**

- **NIH iCite** — citation counts and the *Relative Citation Ratio* (field-normalized: an endo paper is compared with endo papers) for every PubMed article; monthly updates; free API. The primary ranking metric for *Best of [year]*.
- **OpenAlex / Semantic Scholar** — citation counts by DOI; Semantic Scholar's *highly influential citations* (citing work that builds on the paper, not just lists it). Secondary metric and cross-check.
- **Altmetric** — early attention (news, social, policy) within months of publication; drives *Trending*.
- **Journal and society awards** — annual best-paper and research prizes. No API: a hand-curated `paper_awards` list in the admin (paper, award, year, source URL). Award winners are always featured in the year's special.

**Episode kinds** (all `briefings.kind` values; same render pipeline as the weekly)

| Kind | When | Selection | Length |
|---|---|---|---|
| `best_of` | Each January, covering the year before last at first (citations need time), e.g. Jan 2027: *Best of 2025* | Top papers by RCR among the cluster's journals that year; award winners first | 8 full abstracts + headlines, ≈30–35 min |
| `trending` | Quarterly | Highest Altmetric + early-citation momentum among papers 3–12 months old | 6 full abstracts, ≈25 min |
| `classics` | Monthly until the back catalogue is built, then occasional | Most-cited papers of all time per topic within the cluster (e.g. outcomes of primary root canal treatment), 5 per episode | ≈25 min; evergreen |

Grace states the metric in the hand-off: "Published in 2024, cited 61 times since, ranked third of every J-O-E paper that year by relative citation ratio."

**Data and jobs**

- `paper_metrics` — `article_id`, `source` (icite / openalex / s2 / altmetric), `citations`, `rcr`, `influential_citations`, `altmetric_score`, `pulled_at`. One row per source per paper, refreshed monthly by `/api/cron/paper-metrics` (time-boxed, oldest first). The harvest backfills the past three years of each active journal once, so *Best of* and *Classics* have a population to rank.
- `paper_awards` — admin-maintained: `article_id` or DOI, `award`, `year`, `body`, `source_url`.
- Specials are drafted by the same template as the weekly with one extra Grace line per paper giving the metric and rank; rendered and published by the same Monday job on their scheduled dates.

**Honesty rules for specials**

- Every ranked list shows the metric, the source and the date it was pulled, on the page and in the show notes.
- "Best" is always qualified in the audio: "most cited", "highest relative citation ratio", "award-winning". Never an unqualified superlative.
- A paper later retracted is removed from specials and the page is annotated.

## Costs — calculated per episode and displayed

Cost is not an estimate in a doc; the system computes it for every episode and shows it.

**Formula (Soniox published pricing, token-based):** input text $4.00 per 1M tokens at ≈0.3 tokens per character; output audio $21.50 per 1M tokens at ≈30,000 tokens per hour of generated speech. The render job records, per segment, the characters sent and the seconds of audio returned, and sums:

```
soniox_cents  = (chars × 0.3 / 1e6 × 400) + (audio_seconds / 3600 × 30000 / 1e6 × 2150)
llm_cents     = input_tokens × price_in + output_tokens × price_out   (from the API response)
episode_cents = soniox_cents + llm_cents      (storage and bandwidth are tracked monthly, not per episode)
```

Cached segments (an abstract already rendered for another cluster) are counted at zero and shown as "saved".

**Where it is displayed**

- **Admin › Briefings:** per episode: cost, minutes, cents per minute, cached savings; per show: this month and last month; all shows: month-to-date total, projected month, and the Soniox console figure beside it so drift is visible.
- **Owner alert email** on each publish: one line, e.g. "Endodontics This Week · 24 min · $0.31 (8 papers, 2 cached)".
- **Monthly digest** (existing `pending-digest`): total spend for the month across all shows.

**Expected levels (for sizing only; the dashboard is the truth)**

| Item | Per episode | Per week, all 14 shows |
|---|---|---|
| Soniox TTS (~$0.70/hour of audio; endo ≈ 25 min) | ≈ $0.30 | ≈ $4 |
| LLM script draft | < $0.05 | < $1 |
| R2 storage (≈ 25 MB/episode, no egress charge) | negligible | ≈ $0.02/month growth |
| PubMed, Unpaywall, GitHub Actions | free | free |

Rounded, the entire programme should run for well under $25 a month. If the computed monthly total passes a configurable ceiling (default $50), publishing pauses and Andrei is alerted.

---

## Keys and accounts needed (Vercel env + GitHub Actions secrets; never in the repo)

- `SONIOX_API_KEY` (exists, via rootOS account)
- `NCBI_API_KEY` (free, from an NCBI account; raises PubMed rate limits)
- `UNPAYWALL_EMAIL` = `hello@thedentalcommute.com`
- `ANTHROPIC_API_KEY` (script drafts)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- Existing: `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`

---

## Rules that protect us

0. **Authors are always credited.** Every paper that is mentioned, in depth or in brief, is introduced with its authors' names ("by Sabeti and Wang", "by Kumar and colleagues") and its journal; the episode page and show notes list the authors in full. Enforced by a unit test on the script builder.
1. **Expression is theirs, information is everyone's.** For all-rights-reserved papers we speak the facts, numbers, design and conclusions in our own words and quote exactly one attributed sentence from the authors' Conclusions. Abstracts are read verbatim only under a Creative Commons licence on a publisher-hosted copy, with the licence named in the show notes. Every paper is named with journal, authors and a link to the publisher page by DOI. No full text in the podcast feed. Show notes credit the U.S. National Library of Medicine (PubMed) as the bibliographic source and name hello@thedentalcommute.com for rightsholder requests, acted on within 48 hours.
2. **Nothing invented.** Grace's "short version" is drawn from the paper's Conclusions and checked automatically; the template forbids clinical advice.
3. **Disclosure in the audio, the feed and the page.** Same badge as every other AI-narrated show on the site; the "Hide AI-narrated podcasts" toggle hides ours too. That consistency is the point.
4. **Publisher opt-out.** A standing policy on the Journals hub: a publisher that objects gets its journal removed within a week, and the contact is `hello@thedentalcommute.com`.
5. **Automatic, with a kill switch.** Every show has an admin toggle to pause publishing and a one-click *Unpublish* per episode. A failed quality check skips the week and alerts Andrei; nothing doubtful goes out, and nothing waits on a human either.

---

## Open items

- Artwork direction for the show covers (one template, specialty name as the variable).
- Whether general dentistry launches with a relevance filter or waits until the specialties are stable.
- Whether a cluster with a quiet week should borrow its best headline-only papers from the previous roll-over, or simply run short. Current call: run short.
