// Sends an admin-reviewed email to a resource owner (claim approved / needs
// info / invite to claim) via Resend — replaces the old mailto drafts that
// opened Andrei's own mail app. Admin-only; the admin edits the draft first.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { sendOwnerEmail } from '../../../lib/notify';

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const to = String(req.body?.to || '').trim();
  const subject = String(req.body?.subject || '').trim();
  const text = String(req.body?.text || '').trim();
  if (!EMAIL_RE.test(to) || to.length > 254) return res.status(400).json({ error: 'Enter one valid email address.' });
  if (!subject || !text) return res.status(400).json({ error: 'Subject and message are required.' });
  if (subject.length > 200 || text.length > 10000) return res.status(400).json({ error: 'Email is too long.' });

  const result = await sendOwnerEmail({ to, subject, text });
  if (!result.sent) return res.status(502).json({ error: result.reason });
  return res.status(200).json({ ok: true });
}
