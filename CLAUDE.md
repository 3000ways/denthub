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
- **Database/CMS:** Airtable (accessed via API route at `/api/airtable`)
- **Source control:** GitHub (`3000ways/denthub`)
- **Auth (planned):** Google/Apple sign-in → NPI-verified voting

---

## Architecture Notes

- Airtable data is fetched via a Next.js API route: `https://thedentalcommute.com/api/airtable?table=Resources`
- The sandbox/Claude Code cannot reach `api.airtable.com` or `api.vercel.com` directly — always verify data through the live API route above
- Environment variables live in Vercel only (never commit credentials to GitHub — GitHub secret scanning will block it)
- `AIRTABLE_PAT` is stored as a Vercel environment variable
- Vercel env variable changes only take effect after a new deployment; push a GitHub commit to trigger redeploy
- **Never use `{Visible}=1` boolean filter in Airtable** — it's unreliable; remove the filter entirely as a workaround
- Airtable MCP tools require table IDs (`tblXXX`) and field IDs (`fldXXX`), not names

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

---

## Owner
Andrei — Endodontist & founder. Not a developer. Prefers plain-English explanations alongside any code changes. Always explain what a change does and why before making it.
