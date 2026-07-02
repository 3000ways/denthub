// Admin API for reviewing owner-submitted factual corrections (Name, URL,
// Description, Image URL, Host or Author, RSS Feed URL).
//   GET  → list proposals (pending first), merged with the resource's Name.
//   POST → { proposalId, action: 'approve' | 'reject' }
//          approve applies the changes to Airtable; reject just marks status.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

async function resourceNames(ids) {
  if (!ids.length) return {};
  const pat = process.env.AIRTABLE_PAT;
  const formula = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
  const params = new URLSearchParams({ filterByFormula: formula, pageSize: '100' });
  params.append('fields[]', 'Name');
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  (data.records || []).forEach(r => { map[r.id] = r.fields.Name || '(untitled)'; });
  return map;
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await db.from('resource_edit_proposals')
      .select('id, user_id, resource_id, changes, status, created_at')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const ids = [...new Set((data || []).map(p => p.resource_id))];
    const names = await resourceNames(ids);
    const proposals = (data || []).map(p => ({ ...p, resourceName: names[p.resource_id] || p.resource_id }));
    return res.status(200).json({ proposals });
  }

  if (req.method === 'POST') {
    const { proposalId, action } = req.body || {};
    if (!proposalId || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'proposalId and a valid action are required' });

    const { data: proposal, error: fetchErr } = await db.from('resource_edit_proposals').select('*').eq('id', proposalId).single();
    if (fetchErr || !proposal) return res.status(404).json({ error: 'Proposal not found' });

    if (action === 'approve') {
      const fields = {};
      Object.entries(proposal.changes || {}).forEach(([key, diff]) => { fields[key] = diff.new; });
      const patchRes = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ id: proposal.resource_id, fields }] }),
      });
      if (!patchRes.ok) return res.status(500).json({ error: `Airtable PATCH failed: ${await patchRes.text()}` });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const { error } = await db.from('resource_edit_proposals').update({ status, reviewed_at: new Date().toISOString() }).eq('id', proposalId);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ status: 'ok', proposal: { ...proposal, status } });
  }

  return res.status(405).end();
}
