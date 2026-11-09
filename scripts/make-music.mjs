#!/usr/bin/env node
// Journal Briefings — the show's musical signature, generated from code so it is
// ours outright (no licence to track). Produces WAVs in /tmp, converts to MP3
// into public/podcast/music/ with ffmpeg. Re-run to regenerate; the files are
// committed so the render job and the preview can fetch them.
//
//   sting.mp3   ~6.5 s  opening signature: marimba-like motif over a warm pad
//   bed.mp3     ~24 s   soft pad in the same key, for under the welcome (ducked)
//   outro.mp3   ~5.5 s  closing figure, the motif resolving downward
//   turn.mp3    ~0.6 s  a single soft "page turn" before each new paper
//
// Key: E minor 9, unhurried. Everything is additive synthesis + a small
// Schroeder reverb, normalised to -1 dBFS peak.

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SR = 44100;
const OUT = new URL('../public/podcast/music/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const tmp = join(tmpdir(), 'tdc-music'); mkdirSync(tmp, { recursive: true });

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const N = { E3: 52, G3: 55, B3: 59, D4: 62, E4: 64, Fs4: 66, G4: 67, A4: 69, B4: 71, D5: 74, E5: 76, Fs5: 78, G5: 79, B5: 83 };

function buffer(seconds) { return new Float64Array(Math.ceil(seconds * SR)); }

// Marimba-ish pluck: fundamental + bright partials with faster decay, soft attack.
function pluck(buf, t0, note, dur = 1.6, gain = 0.5) {
  const f = midi(note), start = Math.floor(t0 * SR), n = Math.min(buf.length - start, Math.floor(dur * SR));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t * 3.2);
    const v = Math.sin(2 * Math.PI * f * t) * 1.0
            + Math.sin(2 * Math.PI * f * 4 * t) * 0.18 * Math.exp(-t * 9)
            + Math.sin(2 * Math.PI * f * 9.9 * t) * 0.05 * Math.exp(-t * 16);
    buf[start + i] += v * env * gain;
  }
}
// Warm pad: detuned triangles with slow attack and release.
function pad(buf, t0, notes, dur, gain = 0.09, attack = 1.2, release = 1.8) {
  const start = Math.floor(t0 * SR), n = Math.min(buf.length - start, Math.floor(dur * SR));
  const tri = x => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    let v = 0;
    for (const note of notes) {
      const f = midi(note);
      v += tri(f * t * 0.9985) + tri(f * t * 1.0015) * 0.8 + Math.sin(2 * Math.PI * f * 2 * t) * 0.08;
    }
    buf[start + i] += v * env * gain / notes.length;
  }
}
// Small Schroeder reverb (4 combs + 2 allpass), mixed in at `wet`.
function reverb(dry, wet = 0.22, decay = 0.78) {
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d, buf: new Float64Array(d), i: 0 }));
  const aps = [225, 556].map(d => ({ d, buf: new Float64Array(d), i: 0 }));
  const out = new Float64Array(dry.length);
  for (let n = 0; n < dry.length; n++) {
    let s = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.buf[c.i] = dry[n] + y * decay; c.i = (c.i + 1) % c.d; s += y; }
    s /= combs.length;
    for (const a of aps) { const y = a.buf[a.i]; const x = s + y * 0.5; a.buf[a.i] = x; a.i = (a.i + 1) % a.d; s = y - 0.5 * x; }
    out[n] = dry[n] * (1 - wet) + s * wet;
  }
  return out;
}
function normalize(buf, peak = 0.89) { let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v)); const g = m ? peak / m : 1; for (let i = 0; i < buf.length; i++) buf[i] *= g; return buf; }
function fadeOut(buf, seconds) { const n = Math.floor(seconds * SR); for (let i = 0; i < n && i < buf.length; i++) { const k = buf.length - 1 - i; buf[k] *= i / n; } }
function writeWav(path, mono) {
  const n = mono.length, bytes = 44 + n * 2 * 2; const b = Buffer.alloc(bytes);
  b.write('RIFF', 0); b.writeUInt32LE(bytes - 8, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, mono[i])); const s = Math.round(v * 32767); const l = Math.round(Math.max(-1, Math.min(1, mono[i] * (1 + 0.04 * Math.sin(i / 7000)))) * 32767); b.writeInt16LE(l, 44 + i * 4); b.writeInt16LE(s, 46 + i * 4); }
  writeFileSync(path, b);
}
function toMp3(name, mono) {
  const wav = join(tmp, `${name}.wav`); writeWav(wav, mono);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', join(OUT, `${name}.mp3`)]);
  console.log('wrote', name, (mono.length / SR).toFixed(2), 's');
}

// ── sting: pad swells, motif E4 G4 B4 D5 → E5 with a lift, tail rings out ──
{
  const b = buffer(6.5);
  pad(b, 0, [N.E3, N.B3, N.Fs4, N.G4], 6.2, 0.11, 0.9, 2.4);
  const motif = [[0.55, N.E4], [0.85, N.G4], [1.15, N.B4], [1.5, N.D5], [2.05, N.E5]];
  motif.forEach(([t, n], i) => pluck(b, t, n, 2.2, i === motif.length - 1 ? 0.55 : 0.42));
  pluck(b, 2.05, N.B4, 2.4, 0.22); pluck(b, 2.05, N.G4, 2.4, 0.16);   // chord under the top note
  toMp3('sting', normalize(reverb(b, 0.26)));
}
// ── bed: slow pad, gentle movement, seamless enough for a 20–30 s welcome ──
{
  const b = buffer(24);
  pad(b, 0, [N.E3, N.B3, N.Fs4], 12.5, 0.1, 2.0, 2.5);
  pad(b, 11.5, [N.E3, N.D4, N.G4], 12.5, 0.1, 2.0, 2.5);
  [[4.2, N.B4], [9.0, N.G4], [14.5, N.Fs4], [19.2, N.E4]].forEach(([t, n]) => pluck(b, t, n, 2.6, 0.12));
  const r = normalize(reverb(b, 0.3), 0.6); fadeOut(r, 1.5);
  toMp3('bed', r);
}
// ── outro: the motif resolving downward, E5 D5 B4 G4 → E4, pad settles ────
{
  const b = buffer(5.5);
  pad(b, 0, [N.E3, N.B3, N.G4], 5.3, 0.1, 0.4, 2.2);
  [[0.1, N.E5], [0.45, N.D5], [0.8, N.B4], [1.15, N.G4], [1.7, N.E4]].forEach(([t, n], i) => pluck(b, t, n, 2.6, i === 4 ? 0.55 : 0.4));
  pluck(b, 1.7, N.B3, 3.0, 0.2);
  toMp3('outro', normalize(reverb(b, 0.28)));
}
// ── turn: one soft high note, very short ───────────────────────────────────
{
  const b = buffer(0.7);
  pluck(b, 0.02, N.G5, 0.6, 0.5); pluck(b, 0.02, N.B4, 0.5, 0.15);
  toMp3('turn', normalize(reverb(b, 0.18), 0.6));
}
