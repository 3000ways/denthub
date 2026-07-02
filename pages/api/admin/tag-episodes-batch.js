// Admin-triggered episode tagging. Two modes:
//   - Backfill: the admin "Run backfill" button calls this repeatedly (each
//     call processes one bounded chunk within the serverless time budget);
//     the frontend keeps calling it back-to-back until `remaining` hits 0 —
//     no cron cadence involved, so the ~38k-episode archive finishes in under
//     an hour instead of the 250+ days a once-daily rotation would take.
//   - Manual single run: same endpoint, just called once from the admin UI.
//
// New episodes get tagged separately, inside the daily harvest cron
// (pages/api/cron/harvest-episodes.js) — that path stays cron-based since it's
// a small daily volume, well within the time budget.

import { tagUntaggedEpisodes } from '../../../lib/episode-tagger';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const claimSize = Math.min(parseInt(req.query.claimSize, 10) || 300, 500);
    const result = await tagUntaggedEpisodes({ claimSize, trigger: 'backfill' });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
