// Admin API for the "Claim Your Profile" review queue.
//   GET  → list claims (pending first), merged with the resource's Name/URL.
//   POST → { claimId, action: 'approve' | 'reject' }

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

async function resourceNames(ids) {
  // Only real Airtable record ids may be interpolated into the formula — a
  // resource_id comes from a user-submitted claim row, so validate it to prevent
  // formula injection. (audit security #9)
  ids = [...new Set(ids)].filter(id => /^rec[A-Za-z0-9]{14}$/.test(id));
  if (!ids.length) return {};
  const pat = process.env.AIRTABLE_PAT;
  const formula = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
  const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
  ['Name', 'URL'].forEach(f => params.append('fields[]', f));
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  (data.records || []).forEach(r => { map[r.id] = { name: r.fields.Name || '(untitled)', url: r.fields.URL || '' }; });
  return map;
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await db.from('resource_claims')
      .select('id, user_id, resource_id, contact_email, claimant_name, claimant_role, message, status, created_at, reviewed_at')
      .order('status', { ascending: true }) // 'approved' < 'pending' < 'rejected' alphabetically — resorted client-side anyway
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const ids = [...new Set((data || []).map(c => c.resource_id))];
    const names = await resourceNames(ids);
    const claims = (data || []).map(c => ({ ...c, resourceName: names[c.resource_id]?.name || c.resource_id, resourceUrl: names[c.resource_id]?.url || null }));
    return res.status(200).json({ claims });
  }

  if (req.method === 'POST') {
    const { claimId, action } = req.body || {};
    if (!claimId || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'claimId and a valid action are required' });

    const { data: claim, error: fetchErr } = await db.from('resource_claims').select('*').eq('id', claimId).single();
    if (fetchErr || !claim) return res.status(404).json({ error: 'Claim not found' });

    const status = action === 'approve' ? 'approved' : 'rejected';
    const { error } = await db.from('resource_claims').update({ status, reviewed_at: new Date().toISOString() }).eq('id', claimId);
    if (error) return res.status(500).json({ error: error.message });

    const names = await resourceNames([claim.resource_id]);
    const resourceName = names[claim.resource_id]?.name || claim.resource_id;

    // Draft a notification email for Andrei to review and send himself
    // (mailto-based semi-automation — no transactional email vendor needed).
    const site = 'https://thedentalcommute.com';
    const mailto = action === 'approve'
      ? `mailto:${encodeURIComponent(claim.contact_email)}?subject=${encodeURIComponent(`You're approved to manage "${resourceName}" on The Dental Commute`)}&body=${encodeURIComponent(
          `Hi ${claim.claimant_name || 'there'},\n\nGreat news — your claim on "${resourceName}" has been approved!\n\nYou can now edit the listing (description, links, logo, and more) and add a creator bio from your dashboard:\n${site}/my-resources\n\nA couple of things worth knowing:\n- Your score is never affected by claiming or editing your listing — it's computed independently from real activity data, and you can see exactly how on your dashboard.\n- Factual edits (like your URL or description) go through a quick review before they go live, just so we keep the directory accurate.\n\nThanks for being part of The Dental Commute!\n\nAndrei`
        )}`
      : `mailto:${encodeURIComponent(claim.contact_email)}?subject=${encodeURIComponent(`About your claim on "${resourceName}"`)}&body=${encodeURIComponent(
          `Hi ${claim.claimant_name || 'there'},\n\nThanks for reaching out about "${resourceName}" on The Dental Commute. I wasn't able to verify this claim yet — could you reply with a bit more detail (e.g. a link showing your connection to the show)?\n\nHappy to take another look.\n\nAndrei`
        )}`;

    return res.status(200).json({ status: 'ok', claim: { ...claim, status }, mailto });
  }

  return res.status(405).end();
}
