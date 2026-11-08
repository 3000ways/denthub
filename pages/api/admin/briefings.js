// Admin actions on briefings: read one (script + chapters), unpublish an
// episode (removes it from the player/search/feeds; the briefing row stays
// for the record), or delete a draft so the next run re-drafts it.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { finalizePublish } from '../briefings/publish';
import { findCluster } from '../../../lib/journals';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();
  try {
    if (req.method === 'GET') {
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data, error } = await db.from('briefings').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return res.status(200).json({ briefing: data });
    }
    if (req.method === 'POST') {
      const { id, action } = req.body || {};
      if (!id || !action) return res.status(400).json({ error: 'id and action required' });
      const { data: b, error } = await db.from('briefings').select('*').eq('id', id).single();
      if (error || !b) return res.status(404).json({ error: 'not found' });
      const now = new Date().toISOString();
      if (action === 'publish') {
        // A reviewed episode (status rendered) goes live: same path as an automatic publish.
        if (b.status !== 'rendered' || !b.audio_url) return res.status(400).json({ error: 'Only a rendered episode can be published' });
        const c = findCluster(b.cluster) || { show: b.cluster, label: b.cluster, pick: null };
        const out = await finalizePublish(db, b, c, { audio_url: b.audio_url, duration_seconds: b.duration_seconds, chapters: b.chapters, cost_cents: b.cost_cents, cost_breakdown: b.cost_breakdown, checks: b.checks, rendered_at: b.rendered_at });
        return res.status(200).json({ ok: true, ...out });
      }
      if (action === 'unpublish') {
        if (b.episode_id) await db.from('episodes').delete().eq('id', b.episode_id);
        await db.from('briefings').update({ status: 'unpublished', episode_id: null, updated_at: now }).eq('id', id);
        return res.status(200).json({ ok: true });
      }
      if (action === 'redraft') {
        // Put the papers back in the pool and drop the draft/failed/skipped row.
        const ids = [...(b.article_ids || []), ...(b.headline_ids || [])];
        if (ids.length) await db.from('articles').update({ status: 'new', cluster: null, briefing_id: null, updated_at: now }).in('id', ids);
        if (['published'].includes(b.status)) return res.status(400).json({ error: 'unpublish first' });
        await db.from('briefings').delete().eq('id', id);
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'unknown action' });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
