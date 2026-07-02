// Automated scoring — the single scheduled orchestrator (keeps the project
// within Vercel's cron-count limit; the per-pass endpoints recompute-scores and
// judge-scores remain for manual admin triggering).
//
// One operation per day so it always fits the 60s function cap:
//   • Monday (UTC)  → recompute the data scores (recency/popularity/community).
//   • Other days    → judge the next rotating batch (expert/clinical depth).
// Over a week the data pass runs once and the judge churns ~6 batches.

import { recomputeScores } from '../../../lib/score-engine';
import { judgeBatch } from '../../../lib/score-judge';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

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
  try {
    // `?force=data` / `?force=judge` overrides the day-based choice (handy for manual runs).
    const force = req.query.force;
    const isMonday = new Date().getUTCDay() === 1;
    if (force === 'data' || (!force && isMonday)) {
      const data = await recomputeScores({ write: true });
      return res.status(200).json({ status: 'ok', ran: 'data', data });
    }
    const judge = await judgeBatch({ limit: 10 });
    return res.status(200).json({ status: 'ok', ran: 'judge', judge });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
