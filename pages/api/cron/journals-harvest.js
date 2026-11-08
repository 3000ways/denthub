// Journal Briefings — nightly PubMed harvest (plus Unpaywall open-access checks).
//
// Triggered by Vercel Cron (Authorization: Bearer CRON_SECRET), by a manual
// `?secret=` URL, or from the admin Briefings tab (logged-in admin). GET
// without `run=1` returns the status the admin tab shows.

import { harvestJournals, getJournalStatus } from '../../../lib/journal-harvest';
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
  const isCron = (req.headers.authorization || '').startsWith('Bearer ');
  if (req.method === 'GET' && !isCron && req.query.run !== '1') {
    try { return res.status(200).json(await getJournalStatus()); }
    catch (err) { return res.status(500).json({ error: String(err.message || err) }); }
  }
  try {
    const summary = await harvestJournals({ timeBudgetMs: 45000 });
    return res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('[journals-harvest] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
