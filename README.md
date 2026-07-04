# denthub
DentHub — Curated dental resource rankings ([thedentalcommute.com](https://thedentalcommute.com)).

Next.js app. Content lives in Airtable; per-user data (accounts, bookmarks, pins) and the episode archive live in Supabase.

## Local development

```bash
npm install
vercel env pull .env.local   # pull secrets from Vercel into a gitignored .env.local
npm run dev                  # http://localhost:3000
```

**You must have a `.env.local`.** It's gitignored and not committed (removed in PR #80 for security), so a fresh clone has none — and without it every page 500s with `supabaseUrl is required`. `vercel env pull` is the easiest way to get one; otherwise copy the values from the Vercel dashboard.

Required keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AIRTABLE_PAT`. Some features also need `PERPLEXITY_API_KEY` (AI research/scoring), `TURNSTILE_SECRET_KEY` (submit/report anti-spam), and `CRON_SECRET` (harvest/scoring crons).

Deployment is automatic: pushing to `main` triggers a Vercel deploy. Env-var changes only take effect on the next deploy.

See `CLAUDE.md` for full architecture notes and hard-won gotchas.
