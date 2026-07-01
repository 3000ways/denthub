// Automated scoring — recompute endpoint.
//
// Triggered three ways (same pattern as the episode harvester):
//   1. Vercel Cron (nightly) — sends `Authorization: Bearer <CRON_SECRET>`.
//   2. Manual URL — `?secret=<CRON_SECRET>` (or `?secret=...&preview=1` to see
//      the computed scores WITHOUT writing to Airtable).
//   3. Admin panel — a logged-in admin (the "Recompute now" button).
//
// Writes the data-grounded sub-scores (Recency, Community) back to Airtable;
// Airtable's formula recomputes Final Score.

import { recomputeScores } from '../../../lib/score-engine';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

// Recompute touches every resource + writes in batches; give it room. Vercel
// caps this at the plan limit (60s on Hobby).
export const config = { maxDuration: 60 };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  if (secret && header === `Bearer ${secret}`) return true;      // Vercel Cron
  if (secret && (req.query.secret || '') === secret) return true; // manual URL trigger
  if (isAdminAuthenticated(req)) return true;                     // admin panel
  return false;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  // Preview (no writes) when explicitly asked; cron/admin default to writing.
  const preview = req.query.preview === '1';

  try {
    const result = await recomputeScores({ write: !preview });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
