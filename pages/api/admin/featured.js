// GET  ?section=Books  → returns resources with FeaturedSection matching section (public read)
// PATCH { id, section } → sets FeaturedSection on a resource (pass null to clear) — ADMIN ONLY

import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';
const TABLE = 'tblBlou0rXbImoQ75';
const FEATURED_FIELD = 'fldW2Gn1fsmIT3ujI';
const AIRTABLE_ID_RE = /^rec[A-Za-z0-9]{14}$/;       // valid Airtable record id
const SECTION_RE = /^[\w &/-]{1,40}$/;                // safe section label (no quote injection)

function airtableHeaders() {
  return { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' };
}

export default async function handler(req, res) {
  if (!process.env.AIRTABLE_PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  if (req.method === 'GET') {
    const { section } = req.query;
    if (!section) return res.status(400).json({ error: 'section required' });
    if (!SECTION_RE.test(section)) return res.status(400).json({ error: 'invalid section' });

    const params = new URLSearchParams();
    params.set('filterByFormula', `{FeaturedSection}='${section}'`);
    params.set('sort[0][field]', 'Final Score');
    params.set('sort[0][direction]', 'desc');

    let allRecords = [], offset;
    do {
      if (offset) params.set('offset', offset);
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}?${params}`, { headers: airtableHeaders() });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      const data = await r.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ records: allRecords });
  }

  if (req.method === 'PATCH') {
    if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { id, section } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!AIRTABLE_ID_RE.test(id)) return res.status(400).json({ error: 'invalid id' });
    if (section != null && !SECTION_RE.test(section)) return res.status(400).json({ error: 'invalid section' });

    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${id}`, {
      method: 'PATCH',
      headers: airtableHeaders(),
      body: JSON.stringify({ fields: { [FEATURED_FIELD]: section || null } }),
    });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    return res.status(200).json({ record: data });
  }

  return res.status(405).end();
}
