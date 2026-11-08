// Admin: hear an episode BEFORE anything is published. Admin cookie required.
//
//   POST { cluster }      → the show's saved introduction (episode 0)
//   POST { briefing_id }  → a drafted weekly (must be prepared first)
//
// Renders through the same speech pieces and audio_cache keys as the Monday
// render job (lib/briefing-pieces.js), so every clip made here is a cache hit
// when the real episode is produced: a preview costs nothing extra in the end.
// Works in rounds to fit Vercel's 60 s: each call renders what it can and
// returns { done: false, remaining }; the admin calls again until { done: true }.
// The preview MP3 is the cached pieces joined byte-for-byte (same encoder and
// bitrate), fine for listening; the real episode is stitched with ffmpeg.
// Needs SONIOX_API_KEY in Vercel (the render job has it as a GitHub secret).

import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { buildTrailerScript, TTS_MODEL, TTS_SPEED, sonioxCostCents } from '../../../lib/briefing-script';
import { buildPieces, pieceHash } from '../../../lib/briefing-pieces';
import { introJournalNames } from '../../../lib/briefing-draft';
import { findCluster } from '../../../lib/journals';

export const config = { maxDuration: 60 };
const BUCKET = 'briefings';
const BITRATE = 128000;
const BUDGET_MS = 38000;
const CONCURRENCY = 3;

async function soniox({ text, voice }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://tts-rt.soniox.com/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SONIOX_API_KEY}` },
      body: JSON.stringify({ model: TTS_MODEL, language: 'en', voice, audio_format: 'mp3', sample_rate: 44100, bitrate: BITRATE, speed: TTS_SPEED, text }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 2) { await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); continue; }
    throw new Error(`Soniox ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('Soniox: gave up after retries');
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.SONIOX_API_KEY) return res.status(400).json({ error: 'SONIOX_API_KEY is not set in Vercel. Add it (Production) and redeploy, then try again.' });
  const body = req.body || {};
  const db = getSupabaseAdmin();
  const started = Date.now();
  try {
    // ── what to render ───────────────────────────────────────────────────
    let script, target;
    const { data: pron } = await db.from('speech_pronunciations').select('term, spoken_as');
    const pronunciations = (pron || []).map(p => ({ from: p.term, to: p.spoken_as }));
    if (body.briefing_id) {
      const id = Number(body.briefing_id);
      const { data: b } = await db.from('briefings').select('id, cluster, kind, week_of, status, script, checks, preview_meta').eq('id', id).maybeSingle();
      if (!b) return res.status(404).json({ error: 'briefing not found' });
      if (!['draft', 'failed'].includes(b.status)) return res.status(400).json({ error: `This episode is ${b.status}; previews are for drafts.` });
      if (b.kind === 'weekly' && !(b.checks && b.checks.prepared)) return res.status(400).json({ error: 'Prepare the episode first (licence check and summaries), then listen.' });
      if (!Array.isArray(b.script) || !b.script.length) return res.status(400).json({ error: 'This episode has no script.' });
      script = b.script;
      target = { table: 'briefings', match: { id }, key: `previews/${b.cluster}/${b.kind}-${b.week_of}-${id}-${Date.now()}.mp3`, cols: { url: 'preview_url', at: 'preview_at', meta: 'preview_meta' }, meta: b.preview_meta || {}, hashOf: null };
    } else {
      const cluster = String(body.cluster || '');
      const c = findCluster(cluster);
      if (!c) return res.status(400).json({ error: 'unknown show' });
      const [{ data: sh }, { data: js }] = await Promise.all([
        db.from('briefing_shows').select('intro_script, intro_preview_meta').eq('cluster', cluster).maybeSingle(),
        db.from('journals').select('name, active').eq('cluster', cluster).order('id'),
      ]);
      if (!sh || !sh.intro_script) return res.status(400).json({ error: 'Write and save the introduction first.' });
      script = buildTrailerScript({ show: c.show, label: c.label.toLowerCase(), journalNames: introJournalNames(js || []), customText: sh.intro_script });
      target = { table: 'briefing_shows', match: { cluster }, key: `previews/${cluster}/intro-${Date.now()}.mp3`, cols: { url: 'intro_preview_url', at: 'intro_preview_at', meta: 'intro_preview_meta', hash: 'intro_preview_hash' }, meta: sh.intro_preview_meta || {}, hashOf: sh.intro_script };
    }

    // ── pieces + cache lookup ────────────────────────────────────────────
    const { pieces } = buildPieces(script, { pronunciations });
    if (!pieces.length) return res.status(400).json({ error: 'Nothing speakable in this script.' });
    const hashes = pieces.map(p => pieceHash({ voice: p.voice, text: p.text }));
    const { data: hits } = await db.from('audio_cache').select('text_hash, audio_url, duration_seconds, cost_cents, hits').in('text_hash', hashes);
    const cache = Object.fromEntries((hits || []).map(h => [h.text_hash, h]));
    const progress = { rendered: Number(target.meta.progress?.rendered || 0), cents: Number(target.meta.progress?.cents || 0) };

    // ── render what is missing, within budget ────────────────────────────
    const missing = pieces.map((p, i) => ({ ...p, hash: hashes[i] })).filter(p => !cache[p.hash]);
    let next = 0, renderedNow = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (next < missing.length && Date.now() - started < BUDGET_MS) {
        const p = missing[next++];
        const buf = await soniox({ text: p.text, voice: p.voice });
        const dur = Number((buf.length * 8 / BITRATE).toFixed(3));   // CBR estimate; the render job re-measures with ffprobe
        const cents = sonioxCostCents({ chars: p.text.length, audioSeconds: dur });
        const { error: upErr } = await db.storage.from(BUCKET).upload(`cache/${p.hash}.mp3`, buf, { contentType: 'audio/mpeg', upsert: true });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        const url = db.storage.from(BUCKET).getPublicUrl(`cache/${p.hash}.mp3`).data.publicUrl;
        await db.from('audio_cache').upsert({ text_hash: p.hash, voice: p.voice, model: TTS_MODEL, speed: TTS_SPEED, chars: p.text.length, duration_seconds: dur, bytes: buf.length, audio_url: url, cost_cents: cents }, { onConflict: 'text_hash' });
        cache[p.hash] = { text_hash: p.hash, audio_url: url, duration_seconds: dur, cost_cents: cents, hits: 0 };
        renderedNow++; progress.rendered++; progress.cents += cents;
      }
    }));
    const remaining = hashes.filter(h => !cache[h]).length;
    if (remaining > 0) {
      await db.from(target.table).update({ [target.cols.meta]: { ...target.meta, progress }, updated_at: new Date().toISOString() }).match(target.match);
      return res.status(200).json({ done: false, remaining, rendered: renderedNow, total: pieces.length });
    }

    // ── join and store ───────────────────────────────────────────────────
    const bufs = [];
    let seconds = 0;
    for (const h of hashes) {
      const r = await fetch(cache[h].audio_url);
      if (!r.ok) throw new Error(`could not read cached piece ${h.slice(0, 8)}`);
      bufs.push(Buffer.from(await r.arrayBuffer()));
      seconds += Number(cache[h].duration_seconds || 0);
    }
    await db.from('audio_cache').update({ last_used_at: new Date().toISOString() }).in('text_hash', hashes);
    const joined = Buffer.concat(bufs);
    const { error: pErr } = await db.storage.from(BUCKET).upload(target.key, joined, { contentType: 'audio/mpeg', upsert: true });
    if (pErr) throw new Error(`upload preview: ${pErr.message}`);
    const url = db.storage.from(BUCKET).getPublicUrl(target.key).data.publicUrl;
    const meta = { seconds: Math.round(seconds), cents: Number(progress.cents.toFixed(4)), pieces: pieces.length, cached_pieces: pieces.length - progress.rendered, elapsed_ms: Date.now() - started };
    const patch = { [target.cols.url]: url, [target.cols.at]: new Date().toISOString(), [target.cols.meta]: meta, updated_at: new Date().toISOString() };
    if (target.cols.hash && target.hashOf) patch[target.cols.hash] = createHash('sha256').update(target.hashOf).digest('hex');
    await db.from(target.table).update(patch).match(target.match);
    return res.status(200).json({ done: true, url, ...meta });
  } catch (e) {
    console.error('[briefing-preview]', e.message);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
