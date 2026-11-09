// Journal Briefings — the musical signature and how it is mixed into an episode.
//
// Pure: no I/O. The render job (scripts/render-briefings.mjs) asks for a plan
// and an ffmpeg argument list; tests check the plan. The music files are made
// by scripts/make-music.mjs and committed under public/podcast/music/.
//
// Timeline of an episode:
//   0.0        sting starts (the signature)
//   LEAD_IN    speech starts over the sting's tail; the bed plays quietly under
//              the host's opening block and fades out as the first paper begins
//   …          GAP seconds between segments; PAPER_GAP before each new paper,
//              with the page-turn chime in that gap (also before "in brief")
//   close      the outro starts as the host's closing line begins and rings out
//              TAIL seconds after the last word
// Chapters follow this timeline (lib/briefing-music chaptersWithMusic), so a
// paper's chapter starts on its chime.

export const MUSIC = {
  enabled: true,
  files: { sting: 'sting.mp3', bed: 'bed.mp3', outro: 'outro.mp3', turn: 'turn.mp3' },
  durations: { sting: 6.5, bed: 24.0, outro: 5.5, turn: 0.7 },   // seconds, as generated
  leadIn: 2.4,
  gap: 0.45,
  paperGap: 1.1,
  tail: 3.6,
  bedFade: 2.0,
  gainDb: { sting: -6, bed: -23, outro: -7, turn: -15 },
};

const isPaperStart = (seg, prev) => seg.kind === 'handoff' && seg.article_id && (!prev || prev.article_id !== seg.article_id);
const isBriefStart = (seg, prev) => seg.kind === 'headline_slot' && !seg.article_id && (!prev || prev.kind !== 'headline_slot');

/**
 * musicPlan(segments, segDurations, opts)
 *   segments     — the script segments, in order
 *   segDurations — spoken seconds per segment (sum of its pieces)
 * → { segStarts, gapsBefore, overlays, speechEnd, total }
 *   overlays: [{ file, at, fadeOutAt?, until? }] in seconds on the final timeline
 */
export function musicPlan(segments, segDurations, m = MUSIC) {
  const segStarts = [], gapsBefore = [];
  let t = m.leadIn;
  segments.forEach((seg, i) => {
    const prev = i ? segments[i - 1] : null;
    const gap = i === 0 ? 0 : (isPaperStart(seg, prev) || isBriefStart(seg, prev)) ? m.paperGap : m.gap;
    gapsBefore.push(gap);
    t += gap;
    segStarts.push(Number(t.toFixed(3)));
    t += Number(segDurations[i] || 0);
  });
  const speechEnd = Number(t.toFixed(3));
  const overlays = [{ file: 'sting', at: 0 }];

  // Bed: under the opening host block (everything before the first paper or, in
  // a trailer, the first ~20 s), fading out as the first chime approaches.
  const firstPaper = segments.findIndex((seg, i) => isPaperStart(seg, i ? segments[i - 1] : null) || isBriefStart(seg, i ? segments[i - 1] : null));
  const bedUntil = firstPaper > 0 ? segStarts[firstPaper] - gapsBefore[firstPaper] + 0.6 : Math.min(speechEnd, m.leadIn + 20);
  const bedEnd = Math.min(bedUntil, m.durations.bed);
  if (bedEnd > 4) overlays.push({ file: 'bed', at: 0, until: Number(bedEnd.toFixed(3)), fadeOutAt: Number(Math.max(0, bedEnd - m.bedFade).toFixed(3)) });

  // Chimes: in the longer gap before each new paper and before the in-brief block.
  segments.forEach((seg, i) => {
    if (i === 0) return;
    if (isPaperStart(seg, segments[i - 1]) || isBriefStart(seg, segments[i - 1])) overlays.push({ file: 'turn', at: Number((segStarts[i] - 0.75).toFixed(3)) });
  });

  // Outro: starts with the closing line (or just before the end), rings out.
  const closeIdx = segments.findIndex(s => s.kind === 'close');
  const outroAt = closeIdx >= 0 ? Math.max(0, segStarts[closeIdx] - 0.2) : Math.max(0, speechEnd - 2.0);
  overlays.push({ file: 'outro', at: Number(outroAt.toFixed(3)) });

  const total = Number(Math.max(speechEnd + m.tail, outroAt + m.durations.outro + 0.5).toFixed(3));
  return { segStarts, gapsBefore, overlays, speechEnd, total };
}

// Chapters on the music timeline: Welcome at 0, each paper on its chime,
// "In brief" on its chime, Close with the outro.
export function chaptersWithMusic(segments, plan, articlesById = {}, cleanTitle = t => t) {
  const out = [{ title: 'Welcome', start: 0, article_id: null }];
  let lastArticle = null;
  segments.forEach((s, i) => {
    const prev = i ? segments[i - 1] : null;
    if (isPaperStart(s, prev) && s.article_id !== lastArticle) {
      const a = articlesById[s.article_id];
      out.push({ title: a ? cleanTitle(a.title) : 'Paper', start: Number(Math.max(0, plan.segStarts[i] - 0.75).toFixed(2)), article_id: s.article_id });
      lastArticle = s.article_id;
    } else if (isBriefStart(s, prev)) {
      out.push({ title: 'In brief', start: Number(Math.max(0, plan.segStarts[i] - 0.75).toFixed(2)), article_id: null });
    } else if (s.kind === 'close') {
      out.push({ title: 'Close', start: Number(Math.max(0, plan.segStarts[i] - 0.2).toFixed(2)), article_id: null });
    }
  });
  return out;
}

/**
 * ffmpegMixArgs({ pieces, segments, segDurations, musicDir, out })
 *   pieces — [{ file, si }] in order (si = segment index); each segment's
 *            pieces are concatenated in order with no gap between them
 * Builds one ffmpeg invocation: concat speech with generated silences (the
 * concat FILTER, so differing sample formats are fine), then mix the overlays
 * with adelay/volume, limit, and encode stereo MP3. Returns { args, plan }.
 */
export function ffmpegMixArgs({ pieces, segments, segDurations, musicDir, out, m = MUSIC }) {
  const plan = musicPlan(segments, segDurations, m);
  const inputs = [];
  const add = f => { inputs.push('-i', f); return (inputs.length / 2) - 1; };
  const chain = [], concatRefs = [];
  // speech: for each segment, [silence gap] + its pieces
  let silenceN = 0;
  segments.forEach((seg, si) => {
    const gap = plan.gapsBefore[si];
    if (gap > 0) { const lbl = `s${silenceN++}`; chain.push(`anullsrc=r=44100:cl=mono:d=${gap}[${lbl}]`); concatRefs.push(`[${lbl}]`); }
    for (const p of pieces.filter(p => p.si === si)) { const idx = add(p.file); chain.push(`[${idx}:a]aformat=sample_rates=44100:channel_layouts=mono[p${idx}]`); concatRefs.push(`[p${idx}]`); }
  });
  // lead-in silence before everything, and a tail after
  chain.unshift(`anullsrc=r=44100:cl=mono:d=${m.leadIn}[lead]`);
  concatRefs.unshift('[lead]');
  chain.push(`anullsrc=r=44100:cl=mono:d=${Math.max(0.1, plan.total - plan.speechEnd).toFixed(3)}[tailsil]`);
  concatRefs.push('[tailsil]');
  chain.push(`${concatRefs.join('')}concat=n=${concatRefs.length}:v=0:a=1,aformat=channel_layouts=stereo[speech]`);
  // music overlays
  const mixRefs = ['[speech]'];
  plan.overlays.forEach((o, k) => {
    const idx = add(`${musicDir}/${m.files[o.file]}`);
    const fx = [`aformat=sample_rates=44100:channel_layouts=stereo`, `volume=${m.gainDb[o.file]}dB`];
    if (o.until) fx.push(`atrim=0:${o.until}`, `afade=t=out:st=${o.fadeOutAt}:d=${m.bedFade}`);
    const ms = Math.round(o.at * 1000);
    if (ms > 0) fx.push(`adelay=${ms}|${ms}`);
    fx.push(`apad=whole_dur=${plan.total}`);
    chain.push(`[${idx}:a]${fx.join(',')}[m${k}]`);
    mixRefs.push(`[m${k}]`);
  });
  // Mix, then bring the whole episode to the podcast loudness standard (-16 LUFS, -1.5 dBTP) so weeks match.
  chain.push(`${mixRefs.join('')}amix=inputs=${mixRefs.length}:normalize=0:dropout_transition=0,alimiter=limit=0.95:level=false,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${plan.total}[out]`);
  const args = ['-v', 'error', '-y', ...inputs, '-filter_complex', chain.join(';'), '-map', '[out]', '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '2', out];
  return { args, plan };
}
