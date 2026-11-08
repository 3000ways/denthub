// Admin: render a show's introduction episode to audio WITHOUT publishing it,
// so Andrei can listen before pressing Launch. Admin cookie required.
//
// Uses exactly the same text cleaning, voices, model, speed and audio_cache
// keys as the Monday render job, so every piece rendered here is a cache hit
// when the real introduction is produced — a preview costs nothing extra in
// the end. Needs SONIOX_API_KEY in Vercel (the render job has it as a GitHub
// secret; the preview runs on Vercel, so it needs its own copy).
//
// MP3 pieces are joined byte-for-byte (same encoder, same bitrate) — fine for
// a preview; the real episode is stitched with ffmpeg in the render job.

import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { buildTrailerScript, VOICES, TTS_MODEL, TTS_SPEED, sonioxCostCents } from '../../../lib/briefing-script';
import { cleanForSpeech } from '../../../lib/speech-clean';
import { introJournalNames } from '../../../lib/briefing-draft';
import { findCluster } from '../../../lib/journals';

export const config = { maxDuration: 60 };
const PIECE_MAX = 1100;
const BUCKET = 'briefings';
const BITRATE = 128000;

function splitPieces(text, max = PIECE_MAX) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out = []; let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > max && cur) { out.push(cur.trim()); cur = s; }
    else cur = (cur + ' ' + s).trim();
  }
  if (cur) out.push(cur.trim());
  return out.length ? out : [text];
}

async function soniox({ text, voice, model, speed }) {
  const res = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SONIOX_API_KEY}` },
    body: JSON.stringify({ model, language: 'en', voice, audio_format: 'mp3', sample_rate: 44100, bitrate: BITRATE, speed, text }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Soniox ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const cluster = String((req.body || {}).cluster || '');
  const c = findCluster(cluster);
  if (!c) return res.status(400).json({ error: 'unknown show' });
  if (!process.env.SONIOX_API_KEY) return res.status(400).json({ error: 'SONIOX_API_KEY is not set in Vercel. Add it (Production) and redeploy, then try again.' });
  const db = getSupabaseAdmin();
  const started = Date.now();
  try {
    const [{ data: sh }, { data: js }, { data: pron }] = await Promise.all([
      db.from('briefing_shows').select('intro_script').eq('cluster', cluster).maybeSingle(),
      db.from('journals').select('name, active').eq('cluster', cluster).order('id'),
      db.from('speech_pronunciations').select('term, spoken_as'),
    ]);
    if (!sh || !sh.intro_script) return res.status(400).json({ error: 'Write and save the introduction first.' });
    const pronunciations = (pron || []).map(p => ({ from: p.term, to: p.spoken_as }));
    const script = buildTrailerScript({ show: c.show, label: c.label.toLowerCase(), journalNames: introJournalNames(js || []), customText: sh.intro_script });

    // Clean + split exactly as the render job does.
    const pieces = [];
    for (const seg of script) {
      const cleaned = cleanForSpeech(seg.text || '', { pronunciations });
      for (const p of splitPieces(cleaned.text)) if (p.trim()) pieces.push({ text: p, voice: VOICES[seg.speaker] || VOICES.host });
    }
    if (!pieces.length) return res.status(400).json({ error: 'The introduction has no speakable text.' });

    // Render through the shared cache, three at a time (Soniox limit).
    const out = new Array(pieces.length);
    let next = 0, cachedCount = 0, cents = 0, seconds = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < pieces.length) {
        const i = next++;
        const { text, voice } = pieces[i];
        const hash = createHash('sha256').update(`${voice}|${TTS_SPEED}|${TTS_MODEL}|${text}`).digest('hex');
        const { data: hit } = await db.from('audio_cache').select('audio_url, duration_seconds, cost_cents, hits').eq('text_hash', hash).maybeSingle();
        if (hit) {
          const r = await fetch(hit.audio_url);
          if (r.ok) {
            out[i] = Buffer.from(await r.arrayBuffer()); cachedCount++; seconds += Number(hit.duration_seconds || 0);
            await db.from('audio_cache').update({ hits: (hit.hits || 0) + 1, last_used_at: new Date().toISOString() }).eq('text_hash', hash);
            continue;
          }
        }
        const buf = await soniox({ text, voice, model: TTS_MODEL, speed: TTS_SPEED });
        const dur = Number((buf.length * 8 / BITRATE).toFixed(3));   // CBR estimate; the render job re-measures cached files with ffprobe
        const c1 = sonioxCostCents({ chars: text.length, audioSeconds: dur });
        cents += c1; seconds += dur;
        const { error: upErr } = await db.storage.from(BUCKET).upload(`cache/${hash}.mp3`, buf, { contentType: 'audio/mpeg', upsert: true });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        const url = db.storage.from(BUCKET).getPublicUrl(`cache/${hash}.mp3`).data.publicUrl;
        await db.from('audio_cache').upsert({ text_hash: hash, voice, model: TTS_MODEL, speed: TTS_SPEED, chars: text.length, duration_seconds: dur, bytes: buf.length, audio_url: url, cost_cents: c1 }, { onConflict: 'text_hash' });
        out[i] = buf;
      }
    }));

    const joined = Buffer.concat(out);
    const key = `previews/${cluster}/intro-${Date.now()}.mp3`;
    const { error: pErr } = await db.storage.from(BUCKET).upload(key, joined, { contentType: 'audio/mpeg', upsert: true });
    if (pErr) throw new Error(`upload preview: ${pErr.message}`);
    const url = db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    const introHash = createHash('sha256').update(sh.intro_script).digest('hex');
    const meta = { seconds: Math.round(seconds), cents: Number(cents.toFixed(4)), pieces: pieces.length, cached_pieces: cachedCount, elapsed_ms: Date.now() - started };
    await db.from('briefing_shows').update({ intro_preview_url: url, intro_preview_at: new Date().toISOString(), intro_preview_hash: introHash, intro_preview_meta: meta, updated_at: new Date().toISOString() }).eq('cluster', cluster);
    return res.status(200).json({ ok: true, url, ...meta });
  } catch (e) {
    console.error('[briefing-preview]', e.message);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
