// Automated scoring — AI-judge endpoint (Expert + Clinical Depth).
//
// Rotating: each call judges the least-recently-judged batch. Triggered by:
//   1. Vercel Cron (daily) — `Authorization: Bearer <CRON_SECRET>`.
//   2. Manual URL — `?secret=<CRON_SECRET>` (optionally `&limit=N`).
//   3. Admin panel — the "Run AI judge (next batch)" button.

import { judgeBatch } from '../../../lib/score-judge';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

// Each resource is one Perplexity call; the batch runs in parallel. 60s cap on Hobby.
export const config = { maxDuration: 60 };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  if (secret && header === `Bearer ${secret}`) return true;
  if (secret && (req.query.secret || '') === secret) return true;
  if (isAdminAuthenticated(req)) return true;
  return false;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
  try {
    const result = await judgeBatch({ limit });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
