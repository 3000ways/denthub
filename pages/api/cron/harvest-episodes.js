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

import { harvestBatch, getCoverage, getStats } from '../../../lib/harvester';
import { tagUntaggedEpisodes } from '../../../lib/episode-tagger';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

// Give the harvester room to work. Vercel caps this at the plan limit
// (60s on Hobby), so the harvester also self-limits via its time budget.
export const config = { maxDuration: 60 };

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  if (secret && header === `Bearer ${secret}`) return true;      // Vercel Cron
  if (secret && (req.query.secret || '') === secret) return true; // manual URL trigger
  if (isAdminAuthenticated(req)) return true;                     // admin panel (logged-in)
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
      const [coverage, stats] = await Promise.all([getCoverage(), getStats()]);
      return res.status(200).json({ coverage, stats });
    } catch (err) {
      return res.status(500).json({ error: String(err.message || err) });
    }
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 75, 200);
    const summary = await harvestBatch({ limit, timeBudgetMs: 38000 });

    // Tag just-harvested (and any other still-untagged) episodes. Kept small
    // and best-effort: harvestBatch may have already used most of the 60s
    // budget, and a tagging hiccup should never fail the harvest response —
    // the bulk of the archive is caught up separately via the admin backfill
    // (pages/api/admin/tag-episodes-batch.js), which isn't cron-time-boxed.
    // Skip tagging this run if the harvest already ate most of the 60s budget —
    // it'll simply catch up next run; the archive backlog is handled separately
    // by the (non-time-boxed) admin backfill, so there's no urgency here.
    let tagging = null;
    if (summary.elapsedMs < 45000) {
      try {
        tagging = await tagUntaggedEpisodes({ claimSize: 150, trigger: 'harvest' });
      } catch (tagErr) {
        tagging = { status: 'error', error: String(tagErr.message || tagErr) };
      }
    } else {
      tagging = { status: 'skipped_low_time_budget', elapsedMs: summary.elapsedMs };
    }

    return res.status(200).json({ ok: true, ...summary, tagging });
  } catch (err) {
    console.error('[harvest-episodes] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
