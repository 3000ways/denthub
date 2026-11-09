// Admin edits to the journal list: spoken name (what the host voice says) and
// whether a journal is active (harvested + read). Also the pronunciation
// dictionary used by the speech cleaner. Admin cookie required.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const db = getSupabaseAdmin();
  try {
    if (req.method === 'PATCH' && req.body && req.body.cluster && typeof req.body.intro_script === 'string') {
      // The introduction episode's script, written with Andrei. One paragraph per spoken segment.
      const text = req.body.intro_script.trim().slice(0, 6000);
      const { error } = await db.from('briefing_shows').upsert({ cluster: req.body.cluster, intro_script: text || null, intro_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH' && req.body && req.body.cluster && typeof req.body.launched === 'boolean') {
      // Launch gate. Launching requires a saved introduction.
      if (req.body.launched) {
        const { data } = await db.from('briefing_shows').select('intro_script').eq('cluster', req.body.cluster).maybeSingle();
        if (!data || !data.intro_script) return res.status(400).json({ error: 'Write and save the introduction first.' });
      }
      const { error } = await db.from('briefing_shows').upsert({ cluster: req.body.cluster, launched: req.body.launched, launched_at: req.body.launched ? new Date().toISOString() : null, updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH' && req.body && req.body.cluster && (typeof req.body.apple_url === 'string' || typeof req.body.spotify_url === 'string')) {
      // Directory links, pasted once Apple / Spotify approve the show; shown on the hub, show and episode pages.
      const clean = v => { const t = String(v || '').trim(); if (!t) return null; if (!/^https:\/\//i.test(t)) throw new Error('Links must start with https://'); return t.slice(0, 500); };
      const patch = { cluster: req.body.cluster, updated_at: new Date().toISOString() };
      if (typeof req.body.apple_url === 'string') patch.apple_url = clean(req.body.apple_url);
      if (typeof req.body.spotify_url === 'string') patch.spotify_url = clean(req.body.spotify_url);
      const { error } = await db.from('briefing_shows').upsert(patch, { onConflict: 'cluster' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH' && req.body && typeof req.body.review_required === 'boolean' && req.body.cluster) {
      // Review before publishing: the Monday job stops at "rendered" and Andrei publishes from the admin.
      const { error } = await db.from('briefing_shows').upsert({ cluster: req.body.cluster, review_required: req.body.review_required, updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH' && req.body && typeof req.body.paused === 'boolean' && req.body.cluster) {
      // Kill switch for a show: no new episodes publish while paused (drafting and rendering skip it).
      const { error } = await db.from('briefing_shows').upsert({ cluster: req.body.cluster, paused: req.body.paused, updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH') {
      const { id, spoken_name, active, cluster } = req.body || {};
      const patch = { updated_at: new Date().toISOString() };
      if (typeof spoken_name === 'string' && spoken_name.trim()) patch.spoken_name = spoken_name.trim().slice(0, 80);
      if (typeof active === 'boolean') patch.active = active;
      let q = db.from('journals').update(patch);
      if (id) q = q.eq('id', id);
      else if (cluster) q = q.eq('cluster', cluster);   // switch a whole show on/off
      else return res.status(400).json({ error: 'id or cluster required' });
      const { error } = await q;
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'POST' && req.body && req.body.pronunciation) {
      const { term, spoken_as, note } = req.body.pronunciation;
      if (!term || !spoken_as) return res.status(400).json({ error: 'term and spoken_as required' });
      const { error } = await db.from('speech_pronunciations').upsert({ term: String(term).trim().slice(0, 80), spoken_as: String(spoken_as).trim().slice(0, 120), note: note ? String(note).slice(0, 200) : null }, { onConflict: 'term' });
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const { term } = req.query;
      if (!term) return res.status(400).json({ error: 'term required' });
      const { error } = await db.from('speech_pronunciations').delete().eq('term', term);
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      const { data, error } = await db.from('speech_pronunciations').select('*').order('term');
      if (error) throw new Error(error.message);
      return res.status(200).json({ pronunciations: data || [] });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
