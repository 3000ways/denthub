// Journal Briefings — draft this week's scripts (called by the Monday render
// job before it renders, and by the admin "Draft now" button).
// Guard: CRON_SECRET (Bearer or ?secret=) or the admin cookie.

import { draftBriefings, weekOfFor } from '../../../lib/briefing-draft';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export const config = { maxDuration: 60 };

export function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.authorization || '';
  if (secret && header === `Bearer ${secret}`) return true;
  if (secret && (req.query.secret || '') === secret) return true;
  return isAdminAuthenticated(req);
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const weekOf = /^\d{4}-\d{2}-\d{2}$/.test(req.query.week_of || '') ? req.query.week_of : weekOfFor();
    const clusters = typeof req.query.cluster === 'string' && req.query.cluster ? req.query.cluster.split(',') : null;
    const result = await draftBriefings({ weekOf, clusters });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[briefings/draft] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
