// Episode harvest endpoint (Phase A).
//
// Triggered two ways:
//   1. Vercel Cron (daily) — Vercel attaches `Authorization: Bearer <CRON_SECRET>`.
//   2. Manual seeding — call with `?secret=<CRON_SECRET>` (handy to backfill the
//      archive right after deploy instead of waiting for the nightly run; just
//      call it a few times until `processed` reaches `totalShows`).
//
// GET without `run` returns the coverage report (after auth) so you can see how
// many episodes are stored per show without kicking off a harvest.

import { harvestBatch, getCoverage } from '../../../lib/harvester';

// Give the harvester room to work. Vercel caps this at the plan limit
// (60s on Hobby), so the harvester also self-limits via its time budget.
export const config = { maxDuration: 60 };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || '';
  if (header === `Bearer ${secret}`) return true;          // Vercel Cron
  if ((req.query.secret || '') === secret) return true;    // manual trigger
  return false;
}

export default async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Coverage-only view: GET without ?run=1 (cron requests are treated as runs).
  const isCron = (req.headers.authorization || '').startsWith('Bearer ');
  if (req.method === 'GET' && !isCron && req.query.run !== '1') {
    try {
      return res.status(200).json({ coverage: await getCoverage() });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const summary = await harvestBatch({ limit, timeBudgetMs: 50000 });
    return res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('[harvest-episodes] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
