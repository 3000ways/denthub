// GET  ?section=Books  → returns resources with FeaturedSection matching section (public read)
// PATCH { id, section } → sets FeaturedSection on a resource (pass null to clear) — ADMIN ONLY

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getAdminClient, adminUpdateResource } from '../../../lib/resources-db-admin';
import { toAirtableRecord } from '../../../lib/resources-db';

const RECORD_ID_RE = /^rec[A-Za-z0-9]{14}$/;          // valid record id
const SECTION_RE = /^[\w &/-]{1,40}$/;                // safe section label

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { section } = req.query;
    if (!section) return res.status(400).json({ error: 'section required' });
    if (!SECTION_RE.test(section)) return res.status(400).json({ error: 'invalid section' });

    const db = getAdminClient();
    const { data, error } = await db.from('resources').select('*')
      .eq('featured_section', section)
      .order('final_score', { ascending: false, nullsFirst: false });
    if (error) return res.status(500).json({ error: error.message });

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate');
    return res.status(200).json({ records: (data || []).map(toAirtableRecord) });
  }

  if (req.method === 'PATCH') {
    if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { id, section } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (!RECORD_ID_RE.test(id)) return res.status(400).json({ error: 'invalid id' });
    if (section != null && !SECTION_RE.test(section)) return res.status(400).json({ error: 'invalid section' });

    try {
      const record = await adminUpdateResource(id, { FeaturedSection: section || null });
      return res.status(200).json({ record });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
