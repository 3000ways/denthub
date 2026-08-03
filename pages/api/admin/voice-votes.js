// Admin API for the "AI Voice" tab. Reads listener votes (voice_votes) via the
// service-role client, groups them by SHOW (resource), and enriches each with the
// show's name + current Voice Type/Voice Status. A POST sets those two fields —
// the human-confirm step that turns a crowd signal into a public label (or
// clears it). Nothing here is automatic.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { VOICE_TYPES, VOICE_STATUSES } from '../../../lib/voice';
import { adminListResources, adminUpdateResource, getAdminClient } from '../../../lib/resources-db-admin';

const metaFromRecord = rec => ({
  name: rec.fields.Name || '(untitled)',
  type: rec.fields.Type || '',
  voiceType: rec.fields['Voice Type'] || '',
  voiceStatus: rec.fields['Voice Status'] || '',
  voiceNote: rec.fields['Voice Note'] || '',
});

// Look up name + current voice fields for a set of record ids.
async function fetchResourceMeta(ids) {
  const out = {};
  if (!ids.length) return out;
  try {
    const records = await adminListResources({ ids, select: 'id, name, type, voice_type, voice_status, voice_note' });
    for (const rec of records) out[rec.id] = metaFromRecord(rec);
  } catch { /* best-effort enrichment */ }
  return out;
}

// Shows already flagged (Voice Status set) — so bot "Suspected" pre-
// classifications and past confirmations show in the tab even with no votes.
async function fetchFlaggedShows() {
  try {
    const db = getAdminClient();
    const { data, error } = await db.from('resources')
      .select('id, name, type, voice_type, voice_status, voice_note')
      .not('voice_status', 'is', null)
      .neq('voice_status', '');
    if (error) return [];
    return (data || []).map(row => ({
      id: row.id,
      name: row.name || '(untitled)',
      type: row.type || '',
      voiceType: row.voice_type || '',
      voiceStatus: row.voice_status || '',
      voiceNote: row.voice_note || '',
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const admin = getSupabaseAdmin();

  // POST — set Voice Type / Voice Status on a resource (the human-confirm step).
  if (req.method === 'POST') {
    const { resourceId, voiceType, voiceStatus } = req.body || {};
    if (!resourceId || typeof resourceId !== 'string') return res.status(400).json({ error: 'resourceId required' });
    if (voiceType && !VOICE_TYPES.includes(voiceType)) return res.status(400).json({ error: 'invalid voiceType' });
    if (voiceStatus && !VOICE_STATUSES.includes(voiceStatus)) return res.status(400).json({ error: 'invalid voiceStatus' });
    try {
      await adminUpdateResource(resourceId, { 'Voice Type': voiceType || null, 'Voice Status': voiceStatus || null });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'GET') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).end(); }

  try {
    const { data: rows, error } = await admin
      .from('voice_votes')
      .select('resource_id, episode_id, verdict, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);

    // Group by show. Votes with no resource_id (rare) are bucketed under the episode.
    const groups = new Map();
    for (const v of rows || []) {
      const key = v.resource_id ? `r:${v.resource_id}` : `e:${v.episode_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key, resourceId: v.resource_id || null, episodeId: v.resource_id ? null : v.episode_id,
          ai: 0, human: 0, unsure: 0, total: 0, lastVotedAt: v.created_at,
        });
      }
      const g = groups.get(key);
      if (g[v.verdict] != null) g[v.verdict] += 1;
      g.total += 1;
      if (v.created_at > g.lastVotedAt) g.lastVotedAt = v.created_at;
    }

    const list = [...groups.values()];

    // Enrich shows with name + current voice fields, and fold in shows that are
    // already flagged in Airtable (bot-suspected or confirmed) but have no votes.
    const resourceIds = [...new Set(list.filter(g => g.resourceId).map(g => g.resourceId))];
    const [meta, flagged] = await Promise.all([fetchResourceMeta(resourceIds), fetchFlaggedShows()]);

    for (const g of list) {
      const m = g.resourceId ? meta[g.resourceId] : null;
      g.title = m?.name || (g.resourceId || `Episode #${g.episodeId}`);
      g.type = m?.type || '';
      g.voiceType = m?.voiceType || '';
      g.voiceStatus = m?.voiceStatus || '';
      g.voiceNote = m?.voiceNote || '';
      g.link = g.resourceId ? `/resource/${g.resourceId}` : `/episode/${g.episodeId}`;
      const decisive = g.ai + g.human;
      g.aiShare = decisive ? g.ai / decisive : 0;
    }

    // Add flagged-but-unvoted shows as zero-vote rows.
    const present = new Set(list.filter(g => g.resourceId).map(g => g.resourceId));
    for (const s of flagged) {
      if (present.has(s.id)) continue;
      list.push({
        key: `r:${s.id}`, resourceId: s.id, episodeId: null,
        ai: 0, human: 0, unsure: 0, total: 0, lastVotedAt: '',
        title: s.name, type: s.type, voiceType: s.voiceType, voiceStatus: s.voiceStatus,
        voiceNote: s.voiceNote, link: `/resource/${s.id}`, aiShare: 0,
      });
    }

    // Bot-suspected / flagged first, then most AI-leaning, then most-voted.
    const rank = (g) => (g.voiceStatus === 'Suspected' ? 2 : g.voiceStatus === 'Confirmed' ? 1 : 0);
    list.sort((a, b) =>
      (rank(b) - rank(a)) || (b.aiShare - a.aiShare) || (b.total - a.total) ||
      (b.lastVotedAt || '').localeCompare(a.lastVotedAt || ''));

    return res.status(200).json({ groups: list, total: (rows || []).length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
