#!/usr/bin/env node
// Journal Briefings — the Monday render job (runs in GitHub Actions; see
// .github/workflows/render-briefings.yml). Fully automatic:
//
//   1. ask the site to draft this week's scripts (idempotent),
//   2. fetch every drafted briefing,
//   2b. for each weekly: ask the site to prepare it — licence check per paper,
//       own-words summaries for all-rights-reserved papers (the hybrid format),
//       final script — looping until the site says it is done,
//   3. for each: clean every segment for the ear, render it with Soniox
//      (cached by text+voice so a shared abstract is paid for once), stitch
//      with ffmpeg, measure chapters, compute the cost, upload the MP3,
//   4. report back to the site, which publishes the episode (or records the
//      failure) and emails Andrei.
//
// Env (GitHub secrets): SONIOX_API_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET.
// Optional: SITE_URL (default production), SUPABASE_URL, MAX_BRIEFINGS.

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanForSpeech, sectionHeading } from '../lib/speech-clean.js';
import { chaptersFrom, sonioxCostCents } from '../lib/briefing-script.js';

const exec = promisify(execFile);
const SITE = process.env.SITE_URL || 'https://thedentalcommute.com';
const SECRET = process.env.CRON_SECRET;
const SONIOX = process.env.SONIOX_API_KEY;
const SUPA_URL = process.env.SUPABASE_URL || 'https://zbwwzlvmtjftqpjkqpfz.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX = Number(process.env.MAX_BRIEFINGS || 20);
const BUCKET = 'briefings';
const PIECE_MAX = 1100;        // chars per Soniox request (~100 s of audio; the API caps at 2 min)
const CONCURRENCY = 3;         // Soniox REST limit
const MIN_SEC = 45, MAX_SEC = 3900;

for (const [k, v] of Object.entries({ CRON_SECRET: SECRET, SONIOX_API_KEY: SONIOX, SUPABASE_SERVICE_ROLE_KEY: SUPA_KEY })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}
const db = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function site(path, init = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${SITE}${path}${sep}secret=${encodeURIComponent(SECRET)}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`${path}: ${json.error || res.status}`);
  return json;
}

// Split long text at sentence boundaries so each request stays under the cap.
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

async function ffprobeDuration(file) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  return Number(parseFloat(stdout.trim()).toFixed(3));
}

async function upload(path, buffer, contentType) {
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function soniox({ text, voice, model, speed }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://tts-rt.soniox.com/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SONIOX}` },
      body: JSON.stringify({ model, language: 'en', voice, audio_format: 'mp3', sample_rate: 44100, bitrate: 128000, speed, text }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text().catch(() => '');
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue; }
    throw new Error(`Soniox ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('Soniox: gave up after retries');
}

// Render one piece of text in one voice, through the cache. Returns
// { file, seconds, chars, cached, cents }.
async function renderPiece(dir, { text, voice, model, speed }, idx) {
  const hash = createHash('sha256').update(`${voice}|${speed}|${model}|${text}`).digest('hex');
  const file = join(dir, `${idx}.mp3`);
  const { data: hit } = await db.from('audio_cache').select('audio_url, duration_seconds, chars, cost_cents').eq('text_hash', hash).maybeSingle();
  if (hit) {
    const res = await fetch(hit.audio_url);
    if (res.ok) {
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      await db.from('audio_cache').update({ hits: (hit.hits || 0) + 1, last_used_at: new Date().toISOString() }).eq('text_hash', hash);
      // Re-measure: a piece first rendered by the admin preview (no ffprobe on Vercel) stored an estimate.
      const seconds = await ffprobeDuration(file).catch(() => Number(hit.duration_seconds));
      return { file, seconds, chars: hit.chars, cached: true, cents: Number(hit.cost_cents) };
    }
  }
  const buf = await soniox({ text, voice, model, speed });
  await writeFile(file, buf);
  const seconds = await ffprobeDuration(file);
  const cents = sonioxCostCents({ chars: text.length, audioSeconds: seconds });
  const url = await upload(`cache/${hash}.mp3`, buf, 'audio/mpeg');
  await db.from('audio_cache').upsert({ text_hash: hash, voice, model, speed, chars: text.length, duration_seconds: seconds, bytes: buf.length, audio_url: url, cost_cents: cents }, { onConflict: 'text_hash' });
  return { file, seconds, chars: text.length, cached: false, cents };
}

async function renderBriefing(b, ctx) {
  const dir = await mkdtemp(join(tmpdir(), `briefing-${b.id}-`));
  const started = Date.now();
  try {
    // 1. Clean and split every segment into pieces; remember which segment each piece belongs to.
    const pieces = [];
    const removedLog = [];
    b.script.forEach((seg, si) => {
      let text = seg.text || '';
      if (seg.kind === 'abstract' && seg.label) text = `${sectionHeading(seg.label)} ${text}`;
      // ND-licensed abstracts: strip-only cleaning (no rewording of statistics).
      const cleaned = cleanForSpeech(text, { pronunciations: ctx.pronunciations, minimal: !!seg.nd });
      if (cleaned.removed.length) removedLog.push({ segment: si, removed: cleaned.removed.map(r => r.rule) });
      if (/https?:\/\/|www\./i.test(cleaned.text)) throw new Error(`segment ${si} still contains a link after cleaning`);
      for (const p of splitPieces(cleaned.text)) if (p.trim()) pieces.push({ si, text: p, voice: ctx.voices[seg.speaker] || ctx.voices.host });
    });
    if (!pieces.length) throw new Error('script produced no speech');

    // 2. Render with bounded concurrency.
    const results = new Array(pieces.length);
    let next = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
      while (next < pieces.length) {
        const i = next++;
        results[i] = await renderPiece(dir, { ...pieces[i], model: ctx.model, speed: ctx.speed }, i);
      }
    }));

    // 3. Stitch.
    const list = join(dir, 'list.txt');
    await writeFile(list, results.map(r => `file '${r.file}'`).join('\n'));
    const out = join(dir, 'episode.mp3');
    await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
    const duration = await ffprobeDuration(out);
    if (duration < MIN_SEC || duration > MAX_SEC) throw new Error(`duration ${Math.round(duration)}s outside ${MIN_SEC}–${MAX_SEC}s`);

    // 4. Chapters: per-segment durations summed from their pieces.
    const segDur = new Array(b.script.length).fill(0);
    results.forEach((r, i) => { segDur[pieces[i].si] += r.seconds; });
    const chapters = b.kind === 'trailer' ? [{ title: 'Trailer', start: 0, article_id: null }] : chaptersFrom(b.script, segDur, ctx.articles);

    // 5. Cost.
    const fresh = results.filter(r => !r.cached), cached = results.filter(r => r.cached);
    const byVoice = {};
    for (const r of results) { const v = pieces[results.indexOf(r)].voice; byVoice[v] = byVoice[v] || { chars: 0, seconds: 0 }; byVoice[v].chars += r.chars; byVoice[v].seconds += r.seconds; }
    const tts_cents = fresh.reduce((n, r) => n + r.cents, 0);
    const saved_cents = cached.reduce((n, r) => n + r.cents, 0);
    const llm_cents = Number((b.checks && b.checks.llm_cents) || 0);   // summaries written in the prepare step
    const cost_cents = tts_cents + llm_cents;
    const cost_breakdown = { soniox: byVoice, tts_cents: Number(tts_cents.toFixed(4)), segments: results.length, cached_segments: cached.length, saved_cents: Number(saved_cents.toFixed(4)), llm_cents: Number(llm_cents.toFixed(4)), modes: (b.checks && b.checks.modes) || {}, formula: 'Soniox: input $4/1M tok @0.3 tok/char + audio $21.50/1M tok @30k tok/hour; summaries: sonar-pro $3/1M in + $15/1M out + $0.005/request' };

    // 6. Upload episode + chapters JSON.
    const key = `episodes/${b.cluster}/${b.kind}-${b.week_of}-${b.id}.mp3`;
    const audio_url = await upload(key, await readFile(out), 'audio/mpeg');
    await upload(key.replace(/\.mp3$/, '.chapters.json'), Buffer.from(JSON.stringify({ version: '1.2.0', chapters: chapters.map(c => ({ startTime: c.start, title: c.title })) })), 'application/json');

    const checks = { ok: true, pieces: results.length, cached: cached.length, duration_seconds: duration, removed: removedLog.length, elapsed_ms: Date.now() - started };
    const pub = await site('/api/briefings/publish', { method: 'POST', body: JSON.stringify({ briefing_id: b.id, audio_url, duration_seconds: duration, chapters, cost_cents: Number(cost_cents.toFixed(4)), cost_breakdown, checks, rendered_at: new Date().toISOString() }) });
    console.log(`✓ ${b.show} (${b.kind}, ${b.week_of}): ${Math.round(duration / 60)} min, $${(cost_cents / 100).toFixed(2)} (${cached.length} cached) → ${pub.link}`);
  } catch (e) {
    console.error(`✗ ${b.show} (${b.kind}, ${b.week_of}): ${e.message}`);
    await site('/api/briefings/publish', { method: 'POST', body: JSON.stringify({ briefing_id: b.id, status: 'failed', error: e.message, checks: { ok: false, elapsed_ms: Date.now() - started } }) }).catch(err => console.error('could not record failure:', err.message));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

(async () => {
  const draft = await site('/api/briefings/draft');
  console.log(`Drafted for week of ${draft.weekOf}: ${draft.drafted.length} weekly, ${draft.trailers.length} trailers, ${draft.skipped.length} skipped${draft.errors.length ? `, ${draft.errors.length} errors` : ''}`);
  for (const e of draft.errors || []) console.error('  draft error', e.cluster, e.error);
  const pending = await site(`/api/briefings/pending${process.env.RETRY_FAILED === '1' ? '?retry=1' : ''}`);
  const ctx = { pronunciations: pending.pronunciations || [], voices: pending.voices, model: pending.model, speed: pending.speed, articles: pending.articles || {} };
  const list = (pending.briefings || []).slice(0, MAX);
  console.log(`${list.length} briefing(s) to render`);
  for (const b of list) {
    if (b.kind === 'weekly' && !(b.checks && b.checks.prepared)) {
      try {
        let r;
        do {
          r = await site('/api/briefings/prepare', { method: 'POST', body: JSON.stringify({ briefing_id: b.id }) });
          console.log(`  ${b.show}: prepared ${r.processed} paper(s)${r.done ? '' : `, ${r.remaining} to go`}`);
        } while (!r.done);
        b.script = r.script; b.checks = r.checks;
        const m = r.checks && r.checks.modes ? Object.entries(r.checks.modes).map(([k, v]) => `${v} ${k}`).join(', ') : '';
        console.log(`  ${b.show}: ready (${m}; summaries $${(((r.checks || {}).llm_cents || 0) / 100).toFixed(2)})`);
      } catch (e) {
        console.error(`✗ ${b.show} (${b.kind}, ${b.week_of}): prepare failed: ${e.message}`);
        await site('/api/briefings/publish', { method: 'POST', body: JSON.stringify({ briefing_id: b.id, status: 'failed', error: `prepare: ${e.message}`, checks: { ok: false } }) }).catch(err => console.error('could not record failure:', err.message));
        continue;
      }
    }
    await renderBriefing(b, ctx);
  }
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
