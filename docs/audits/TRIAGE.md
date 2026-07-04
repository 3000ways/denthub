# Audit Triage — consolidated & prioritized (2026-07-04)

Master action list distilled from the four audit reports in this folder
(`security.md`, `backend.md`, `ai-bots.md`, `frontend.md`), de-duplicated across
them. Findings reported by two auditors independently are marked ⭐ (higher confidence).

**Fix in batches, each a branch + PR. "Find" and "fix" stay separate.**

---

## ✅ Shipped 2026-07-04 (merged to main)

- **PR-1 (#75):** admin session cookie now HMAC-signed + expiry-checked; `/api/admin/featured`
  requires admin auth + input sanitized; **migration 0017** locks `profiles` to owner-only reads.
- **PR-2 (#77):** account deletion is now complete server-side + honest client-side (only signs
  out on confirmed success); community/recency score queries paginated (no 1000-row truncation).
- **PR-3 (#76):** stale resource-page state fixed (key by `record.id`); "sample data" banner on
  demo fallback; change-password auto-redeploy fixed (real repoId + branch).

**⚠️ Post-merge actions still required:**
1. **Apply migration `0017_profiles_owner_read.sql` to Supabase** — the PII fix does NOT take
   effect until the migration runs against the live DB (merging code alone doesn't apply it).
2. **Re-log into the admin panel** after deploy (old unsigned cookies are now rejected).
3. (Optional) set `ADMIN_SESSION_SECRET` in Vercel for defense-in-depth.

**Still open** (deferred — need the Supabase connection or more design): harvester CE-history
deletion (PR-2 remainder), `upsert-episode` hardening, AI-judge prompt-injection, CE-hours
server-side check, frontend mobile/a11y (PR-3 remainder), PR-4 hardening.

---

## 🔴 PR-1 — Critical security (exploitable now, low-risk fixes)

- [ ] **Admin auth is forgeable** ⭐ (security #1, ai-bots C1). `lib/admin-auth.js` only
      checks the cookie *exists*. Anyone sends `Cookie: tdc_admin=x` → full admin: dump
      user emails/NPI, rewrite scores, change the password & lock out the owner, spend AI
      budget. **Fix:** HMAC-sign the cookie; verify signature + expiry, constant-time.
- [ ] **`profiles` world-readable** (security #2). Anon can read every user's email + name
      + NPI. **Fix:** RLS SELECT → owner-only. (Verified safe: app only reads own profile.)
- [ ] **`/api/admin/featured` has no auth** ⭐ (security #3, backend M13, frontend note).
      Anyone can rewrite/wipe homepage featured picks. **Fix:** require admin on writes.

## 🟠 PR-2 — Data integrity & trust

- [ ] **Harvester deletes users' CE history** (backend C1). Unpublishing/merging a podcast
      cascade-deletes listening/CE records, episode bookmarks, pins. **Irreversible.**
      **Fix:** soft-delete or re-point rows before delete (or FK RESTRICT as a stopgap).
      ⚠️ **Until fixed: do NOT unpublish or merge any podcast in Airtable.**
- [ ] **`/api/upsert-episode` unauthenticated service-role write** ⭐ (security #4, backend
      H1). Anyone can poison the archive (fake audio, skewed recency/scores) and create
      duplicate episodes; sparse Play payloads null-out real metadata. **Fix:** require a
      user session, validate `show_resource_id`, non-destructive upsert, shared guid helper.
- [ ] **Prompt injection into the AI judge** ⭐ (security #6, ai-bots C2). Planted episode
      titles can inflate Expert/Clinical (40% of the score). **Fix:** delimit external text
      as data-not-instructions; closing upsert-episode removes the main channel.
- [ ] **CE hours forgeable client-side** (security #5). Move the 80%-played decision
      server-side; make `completed` client-non-writable.
- [ ] **Account deletion fire-and-forget; may orphan votes/comments** (backend H2). Move the
      full cascade server-side into `/api/delete-account`, check every step.
- [ ] **Silent truncation at 1000 rows (Supabase) / 100 (Airtable)** (backend H3, M2).
      Community/recency scores undercount as data grows; 5 stats endpoints miss offset loops.
- [ ] **fix-feeds can assign the wrong show's feed** (backend H4). Verify channel title
      before writing; drop positional AI fallback.
- [ ] **change-password redeploy never works** (backend H5) — root-caused: null `repoId`.

## 🟡 PR-3 — Frontend correctness & UX

- [ ] **Stale page state between resource pages** (frontend #1, Critical). Wrong logo/bio/
      episode list on navigation. **Fix:** `key` the page by `record.id`.
- [ ] **Fake demo resources shown as real rankings** (frontend #2) when Airtable fails.
- [ ] **Player bar covers page bottom on mobile**; **logo overlaps tabs** (frontend #3, #4).
- [ ] **Accessibility**: card rows & player controls not keyboard/screen-reader usable
      (frontend #5, #6, #7).

## ⚪ PR-4 — Hardening & polish (Mediums/Lows)

- [ ] Security headers (CSP/X-Frame-Options); `.gitignore` env files + untrack `.env.local`;
      cron secret only via header (not `?secret=`); Airtable formula-injection escaping;
      SSRF guard on `detect-url`; constant-time password compare; retry/backoff on Perplexity
      429s; harvest+tag 60s-cap risk; judge rotation starvation; design-system consolidation
      (`lib/theme.js`); + the Low nits catalogued in each report; **add unit tests** for
      `lib/scoring.js`.

---

## ❓ Decisions / verifications needed from Andrei (block correct fixes)

1. **Airtable "Final Score" formula — does it treat a blank sub-score as 0?** (ai-bots H2)
   If yes, every not-yet-judged resource is dragged ~40 pts low. **Check in Airtable.**
2. **Do `votes`/`comments`/`comment_upvotes` cascade-delete with the user?** (backend H2)
   **Check in Supabase dashboard.** (PR-2's server-side deletion makes this moot anyway.)
3. **Scoring philosophy** (ai-bots H1, M1, M2): AI scores aren't reproducible run-to-run;
   podcast popularity = back-catalog size; percentile drift. How defensible do we want scores?

## ✅ Verified OK by the audits (no action)

Account-deletion FK cascade chain; pins one-per-day limit; `resource_reports` table;
Claim-Your-Profile RLS `EXISTS`-on-approved-claim enforcement; service-role key is
server-only; episode-tagger whitelists AI output; `votes` UNIQUE constraint; harvest
refresh-on-view throttling; recency-view SQL; scoring math edge cases.
