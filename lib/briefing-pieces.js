// Journal Briefings — turning a script into speech pieces, ONE way.
//
// Both the Monday render job (scripts/render-briefings.mjs) and the admin
// listen-before-you-publish preview (pages/api/admin/briefing-preview.js) must
// produce byte-identical requests to Soniox, because the audio cache is keyed
// by voice|speed|model|text: a piece the admin previewed is then free for the
// real render. So the cleaning, section headings, splitting and hashing live
// here and nowhere else.

import { createHash } from 'crypto';
import { cleanForSpeech, sectionHeading } from './speech-clean.js';
import { VOICES, TTS_MODEL, TTS_SPEED } from './briefing-script.js';

export const PIECE_MAX = 1100;   // chars per Soniox request (~100 s of audio; the API caps at 2 min)

// Split long text at sentence boundaries so each request stays under the cap.
export function splitPieces(text, max = PIECE_MAX) {
  const sentences = String(text || '').split(/(?<=[.!?])\s+/);
  const out = []; let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > max && cur) { out.push(cur.trim()); cur = s; }
    else cur = (cur + ' ' + s).trim();
  }
  if (cur) out.push(cur.trim());
  return out.length ? out : [String(text || '')];
}

/**
 * buildPieces(script, { pronunciations, voices })
 *   → { pieces: [{ si, text, voice }], removed: [{ segment, removed: [rule…] }] }
 * Throws if a link survives cleaning (it must never be spoken).
 */
export function buildPieces(script, { pronunciations = [], voices = VOICES } = {}) {
  const pieces = [], removed = [];
  (script || []).forEach((seg, si) => {
    let text = seg.text || '';
    if (seg.kind === 'abstract' && seg.label) text = `${sectionHeading(seg.label)} ${text}`;
    // ND-licensed abstracts: strip-only cleaning (no rewording of statistics).
    const cleaned = cleanForSpeech(text, { pronunciations, minimal: !!seg.nd });
    if (cleaned.removed.length) removed.push({ segment: si, removed: cleaned.removed.map(r => r.rule) });
    if (/https?:\/\/|www\./i.test(cleaned.text)) throw new Error(`segment ${si} still contains a link after cleaning`);
    for (const p of splitPieces(cleaned.text)) if (p.trim()) pieces.push({ si, text: p, voice: voices[seg.speaker] || voices.host });
  });
  return { pieces, removed };
}

export function pieceHash({ voice, text, speed = TTS_SPEED, model = TTS_MODEL }) {
  return createHash('sha256').update(`${voice}|${speed}|${model}|${text}`).digest('hex');
}
