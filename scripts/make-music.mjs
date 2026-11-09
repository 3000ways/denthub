#!/usr/bin/env node
// Journal Briefings — the show's musical signature, generated from code so it is
// ours outright (no licence to track). Produces WAVs in /tmp, converts to MP3
// into public/podcast/music/ with ffmpeg. Re-run to regenerate; the files are
// committed so the render job and the preview can fetch them.
//
//   sting.mp3   ~6.2 s  opening signature ("big brass", owner's pick 2026-11-09):
//                       punchy horn-style riff over drums, climbing to a hit
//   bed.mp3     ~24 s   soft pad in the same key, for under the welcome (ducked)
//   outro.mp3   ~4.8 s  the riff resolving onto the home chord
//   turn.mp3    ~0.6 s  a single soft "page turn" before each new paper
//
// Key: E-flat major, 120 bpm. Everything is additive synthesis + a small
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
// Brass-ish stab: sawtooth chord, quick attack, medium decay, dulling over time.
const saw = (f, t, h = 8) => { let v = 0; for (let k = 1; k <= h; k++) v += Math.sin(2 * Math.PI * f * k * t) / k; return v * 0.6; };
function stab(buf, t0, notes, dur = 0.55, gain = 0.28) {
  const start = Math.floor(t0 * SR), n = Math.min(buf.length - start, Math.floor(dur * SR));
  for (let i = 0; i < n; i++) { const t = i / SR; const env = Math.min(1, t / 0.01) * Math.exp(-t * 4.5) * Math.min(1, (dur - t) / 0.08); let v = 0;
    for (const note of notes) { const f = midi(note); v += saw(f, t, t < 0.15 ? 10 : 5) + saw(f * 1.003, t, 5) * 0.5; }
    buf[start + i] += v * env * gain / notes.length; }
}
function lead(buf, t0, note, dur = 0.3, gain = 0.3) {
  const f = midi(note), start = Math.floor(t0 * SR), n = Math.min(buf.length - start, Math.floor(dur * SR));
  for (let i = 0; i < n; i++) { const t = i / SR; const env = Math.min(1, t / 0.006) * Math.min(1, (dur - t) / 0.05) * (0.7 + 0.3 * Math.exp(-t * 6)); buf[start + i] += (saw(f * 0.997, t, 7) + saw(f * 1.003, t, 7) + Math.sin(2 * Math.PI * f * t) * 0.6) * env * gain * 0.5; }
}
function bass(buf, t0, note, dur = 0.22, gain = 0.3) {
  const f = midi(note), start = Math.floor(t0 * SR), n = Math.min(buf.length - start, Math.floor(dur * SR));
  for (let i = 0; i < n; i++) { const t = i / SR; const env = Math.min(1, t / 0.004) * Math.min(1, (dur - t) / 0.03); buf[start + i] += (Math.sin(2 * Math.PI * f * t) * 0.8 + saw(f, t, 4) * 0.25) * env * gain; }
}
function kick(buf, t0, gain = 0.35) {
  const start = Math.floor(t0 * SR), n = Math.floor(0.3 * SR);
  for (let i = 0; i < n && start + i < buf.length; i++) { const t = i / SR; const f = 42 + 110 * Math.exp(-t * 28); buf[start + i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 11) * gain; }
}
function hat(buf, t0, gain = 0.05) {
  const start = Math.floor(t0 * SR), n = Math.floor(0.05 * SR); let s = 12345;
  for (let i = 0; i < n && start + i < buf.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; buf[start + i] += ((s / 0x7fffffff) * 2 - 1) * Math.exp(-(i / SR) * 90) * gain; }
}
function clap(buf, t0, gain = 0.12) {
  const start = Math.floor(t0 * SR), n = Math.floor(0.12 * SR); let s = 777;
  for (let i = 0; i < n && start + i < buf.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const t = i / SR; buf[start + i] += ((s / 0x7fffffff) * 2 - 1) * Math.exp(-t * 38) * (t < 0.01 ? t / 0.01 : 1) * gain; }
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

const K = { Eb3: 51, F3: 53, G3: 55, Ab3: 56, Bb3: 58, C4: 60, D4: 62, Eb4: 63, F4: 65, G4: 67, Ab4: 68, Bb4: 70, C5: 72, D5: 74, Eb5: 75, F5: 77, G5: 79, Ab5: 80, Bb5: 82, Eb6: 87 };
const bt = 60 / 120, s8 = bt / 2;

// ── sting: horn riff over drums, climbing to the home chord with a high lead ─
{
  const b = buffer(6.2);
  for (let k = 0; k < 10; k++) { kick(b, k * bt, 0.4); clap(b, k * bt + s8, 0.07); }
  for (let k = 0; k < 20; k++) hat(b, k * s8, k % 2 ? 0.03 : 0.045);
  const riff = [[0, [K.Eb4, K.G4, K.Bb4]], [0.5, [K.Eb4, K.G4, K.Bb4]], [1, [K.F4, K.Ab4, K.C5]], [1.75, [K.G4, K.Bb4, K.Eb5]], [2.5, [K.Ab4, K.C5, K.Eb5]], [3, [K.Bb4, K.D5, K.F5]], [3.5, [K.Bb4, K.D5, K.F5]]];
  riff.forEach(([beat, ch]) => { stab(b, beat * bt, ch, 0.42, 0.34); bass(b, beat * bt, ch[0] - 24, 0.3, 0.32); });
  kick(b, 4 * bt, 0.55); stab(b, 4 * bt, [K.Eb4, K.G4, K.Bb4, K.Eb5], 2.0, 0.42); pad(b, 4 * bt, [K.Eb3, K.Bb3, K.G4, K.Bb4], 4.0, 0.12, 0.05, 2.0);
  lead(b, 4 * bt, K.G5, 1.6, 0.32); lead(b, 4 * bt + s8, K.Bb5, 1.4, 0.22); lead(b, 4 * bt + bt, K.Eb6, 1.6, 0.34);
  toMp3('sting', normalize(reverb(b, 0.14)));
}
// ── bed: quiet E-flat pad with a slow lift, for under the welcome ───────────
{
  const b = buffer(24);
  pad(b, 0, [K.Eb3, K.Bb3, K.G4], 12.5, 0.1, 2.0, 2.5);
  pad(b, 11.5, [K.Ab3, K.C4, K.Eb4, K.G4], 12.5, 0.1, 2.0, 2.5);
  [[4.2, K.Bb4], [9.0, K.G4], [14.5, K.Ab4], [19.2, K.Eb4]].forEach(([t, n]) => pluck(b, t, n, 2.6, 0.12));
  const r = normalize(reverb(b, 0.3), 0.6); fadeOut(r, 1.5);
  toMp3('bed', r);
}
// ── outro: three stabs stepping down, then the home chord ───────────────────
{
  const o = buffer(4.8);
  [[0, [K.Bb4, K.D5, K.F5]], [0.5, [K.Ab4, K.C5, K.Eb5]], [1, [K.F4, K.Ab4, K.C5]]].forEach(([beat, ch]) => { stab(o, beat * bt, ch, 0.42, 0.34); kick(o, beat * bt, 0.4); bass(o, beat * bt, ch[0] - 24, 0.3, 0.32); });
  kick(o, 2 * bt, 0.55); stab(o, 2 * bt, [K.Eb4, K.G4, K.Bb4, K.Eb5], 2.2, 0.42); pad(o, 2 * bt, [K.Eb3, K.Bb3, K.G4], 3.6, 0.12, 0.05, 1.8); lead(o, 2 * bt, K.Eb6, 1.8, 0.34);
  toMp3('outro', normalize(reverb(o, 0.14)));
}
// ── turn: one short brass tap in the key, very quiet in the mix ─────────────
{
  const b = buffer(0.7);
  stab(b, 0.02, [K.Bb4, K.Eb5], 0.4, 0.3); pluck(b, 0.02, K.Bb5, 0.5, 0.25, 6);
  toMp3('turn', normalize(reverb(b, 0.16), 0.6));
}
