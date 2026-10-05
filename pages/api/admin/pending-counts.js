// Admin tab badges: how many claims, edit proposals, visitor submissions and
// open reports are waiting. Same queries as the morning digest, so the badge
// and the email always agree.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getPendingCounts } from '../../../lib/pending-digest';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const c = await getPendingCounts();
    return res.status(200).json({
      claims: c.claims.count,
      edits: c.edits.count,
      submissions: c.submissions.count,
      reports: c.reports.count,
      aiQueue: c.aiQueue.count,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
