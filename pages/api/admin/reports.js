// Admin API for the Reports tab. Reads/writes the resource_reports table via the
// service-role client (the table has no client policies), enriches each report
// with its resource name or episode title, and groups them by target so a
// resource flagged five times shows as one row with a count.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { adminListResources } from '../../../lib/resources-db-admin';

// Look up resource names for a set of record ids.
async function fetchResourceNames(ids) {
  const out = {};
  if (!ids.length) return out;
  try {
    const records = await adminListResources({ ids, select: 'id, name, type' });
    for (const rec of records) out[rec.id] = { name: rec.fields.Name || '(untitled)', type: rec.fields.Type || '' };
  } catch { /* best-effort enrichment */ }
  return out;
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const admin = getSupabaseAdmin();

  // Update the status of one or more report rows (resolve / dismiss / reopen).
  if (req.method === 'POST') {
    const { ids, action } = req.body || {};
    const list = Array.isArray(ids) ? ids : (ids != null ? [ids] : []);
    const statusByAction = { resolve: 'resolved', dismiss: 'dismissed', reopen: 'open' };
    const status = statusByAction[action];
    if (!list.length || !status) return res.status(400).json({ error: 'Provide ids and a valid action' });
    const { error } = await admin.from('resource_reports')
      .update({ status, reviewed_at: new Date().toISOString() })
      .in('id', list);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).end();

  const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';

  try {
    const { data: rows, error } = await admin
      .from('resource_reports')
      .select('id, resource_id, episode_id, reason, note, status, created_at')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    // Group by target (resource or episode).
    const groups = new Map();
    for (const r of rows || []) {
      const key = r.resource_id ? `r:${r.resource_id}` : `e:${r.episode_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key, resourceId: r.resource_id, episodeId: r.episode_id,
          count: 0, ids: [], reasons: {}, notes: [], lastReportedAt: r.created_at,
        });
      }
      const g = groups.get(key);
      g.count += 1;
      g.ids.push(r.id);
      g.reasons[r.reason] = (g.reasons[r.reason] || 0) + 1;
      if (r.note) g.notes.push({ reason: r.reason, note: r.note, at: r.created_at });
      if (r.created_at > g.lastReportedAt) g.lastReportedAt = r.created_at;
    }
    const list = [...groups.values()].sort((a, b) => b.lastReportedAt.localeCompare(a.lastReportedAt));

    // Enrich with names/titles.
    const resourceIds = [...new Set(list.filter(g => g.resourceId).map(g => g.resourceId))];
    const episodeIds  = [...new Set(list.filter(g => g.episodeId).map(g => g.episodeId))];

    const [names, epRows] = await Promise.all([
      fetchResourceNames(resourceIds),
      episodeIds.length
        ? admin.from('episodes').select('id, title, show_name, show_resource_id').in('id', episodeIds).then(r => r.data || [])
        : Promise.resolve([]),
    ]);
    const epById = new Map(epRows.map(e => [e.id, e]));

    for (const g of list) {
      if (g.resourceId) {
        g.title = names[g.resourceId]?.name || g.resourceId;
        g.type = names[g.resourceId]?.type || 'Resource';
        g.link = `/resource/${g.resourceId}`;
      } else {
        const ep = epById.get(g.episodeId);
        g.title = ep?.title || `Episode #${g.episodeId}`;
        g.type = 'Episode';
        g.showName = ep?.show_name || null;
        g.link = `/episode/${g.episodeId}`;
      }
    }

    return res.status(200).json({ groups: list, total: (rows || []).length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
