// Admin composer backend for the home page layout (home_layout table).
//
// One row per audience ('logged_out' | 'logged_in'). Each of `draft` and
// `published` is { blocks: [ { key, on, settings }, ... ] }. The admin edits the
// draft; Publish copies draft -> published; the live home renders `published`
// (via the public /api/home-layout, anon key + public-read RLS).
//
//   GET                       -> { logged_out: {draft, published}, logged_in: {...} }
//   PUT  { audience, blocks } -> saves the draft for one audience
//   POST { audience }         -> publishes that audience's draft (draft -> published)
//
// Writes use the service-role key (browser never touches it). A missing/empty
// draft falls back to the code default so the editor always has something to show.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { AUDIENCES, BLOCK_META, defaultBlocksFor, blockAvailableFor } from '../../../lib/home-layout';

// Keep only well-formed rows for real blocks that belong to this audience.
function sanitizeBlocks(blocks, audience) {
  if (!Array.isArray(blocks)) return null;
  const seen = new Set();
  const clean = [];
  for (const b of blocks) {
    if (!b || typeof b.key !== 'string') continue;
    if (!BLOCK_META[b.key]) continue;               // unknown block
    if (!blockAvailableFor(b.key, audience)) continue; // wrong audience
    if (seen.has(b.key)) continue;                  // dedupe
    seen.add(b.key);
    clean.push({
      key: b.key,
      on: b.on !== false,
      settings: b.settings && typeof b.settings === 'object' ? b.settings : {},
    });
  }
  return clean;
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await db.from('home_layout').select('audience, draft, published');
      if (error) throw new Error(error.message);
      const rows = {};
      (data || []).forEach(r => { rows[r.audience] = r; });
      const out = {};
      AUDIENCES.forEach(a => {
        const row = rows[a] || {};
        const draftBlocks = row.draft && Array.isArray(row.draft.blocks) ? row.draft.blocks : null;
        const pubBlocks = row.published && Array.isArray(row.published.blocks) ? row.published.blocks : null;
        out[a] = {
          draft: draftBlocks || defaultBlocksFor(a),
          published: pubBlocks, // null = never published (home uses code default)
        };
      });
      return res.status(200).json(out);
    }

    if (req.method === 'PUT') {
      const { audience, blocks } = req.body || {};
      if (!AUDIENCES.includes(audience)) return res.status(400).json({ error: 'invalid audience' });
      const clean = sanitizeBlocks(blocks, audience);
      if (!clean) return res.status(400).json({ error: 'blocks must be an array' });
      const { error } = await db.from('home_layout')
        .upsert({ audience, draft: { blocks: clean }, updated_at: new Date().toISOString() }, { onConflict: 'audience' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true, blocks: clean });
    }

    if (req.method === 'POST') {
      const { audience } = req.body || {};
      if (!AUDIENCES.includes(audience)) return res.status(400).json({ error: 'invalid audience' });
      const { data: row, error: readErr } = await db.from('home_layout')
        .select('draft').eq('audience', audience).maybeSingle();
      if (readErr) throw new Error(readErr.message);
      const draftBlocks = row && row.draft && Array.isArray(row.draft.blocks) ? row.draft.blocks : defaultBlocksFor(audience);
      const clean = sanitizeBlocks(draftBlocks, audience) || defaultBlocksFor(audience);
      const { error } = await db.from('home_layout')
        .upsert({ audience, draft: { blocks: clean }, published: { blocks: clean }, updated_at: new Date().toISOString() }, { onConflict: 'audience' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true, blocks: clean });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
