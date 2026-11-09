import test from 'node:test';
import assert from 'node:assert/strict';
import { musicPlan, chaptersWithMusic, ffmpegMixArgs, MUSIC } from '../lib/briefing-music.js';

const segs = [
  { kind: 'welcome', speaker: 'host' }, { kind: 'disclosure', speaker: 'host' }, { kind: 'headlines', speaker: 'host' },
  { kind: 'handoff', speaker: 'host', article_id: 1 }, { kind: 'summary', speaker: 'reader', article_id: 1 }, { kind: 'quote', speaker: 'host', article_id: 1 },
  { kind: 'handoff', speaker: 'host', article_id: 2 }, { kind: 'abstract', speaker: 'reader', article_id: 2 }, { kind: 'abstract', speaker: 'reader', article_id: 2 }, { kind: 'short_version', speaker: 'host', article_id: 2 },
  { kind: 'headline_slot', speaker: 'host' }, { kind: 'headline_slot', speaker: 'host', article_id: 3 },
  { kind: 'close', speaker: 'host' },
];
const durs = [12, 10, 20, 6, 60, 8, 6, 50, 40, 7, 4, 15, 9];

test('plan: speech starts after the lead-in, papers get the longer gap, outro rings out', () => {
  const p = musicPlan(segs, durs);
  assert.equal(p.segStarts[0], MUSIC.leadIn);
  assert.equal(p.gapsBefore[3], MUSIC.paperGap, 'first paper hand-off');
  assert.equal(p.gapsBefore[4], MUSIC.gap, 'inside a paper');
  assert.equal(p.gapsBefore[6], MUSIC.paperGap, 'second paper');
  assert.equal(p.gapsBefore[10], MUSIC.paperGap, 'in-brief block');
  for (let i = 1; i < p.segStarts.length; i++) assert.ok(p.segStarts[i] > p.segStarts[i - 1]);
  assert.ok(p.total > p.speechEnd);
  const files = p.overlays.map(o => o.file);
  assert.equal(files[0], 'sting');
  assert.equal(files.filter(f => f === 'turn').length, 3, 'two papers + in brief');
  assert.equal(files.filter(f => f === 'outro').length, 1);
  const bed = p.overlays.find(o => o.file === 'bed');
  assert.ok(bed && bed.until > 20 && bed.until <= MUSIC.durations.bed && bed.fadeOutAt < bed.until, 'bed under the opening block, fading out');
  const outro = p.overlays.find(o => o.file === 'outro');
  assert.ok(Math.abs(outro.at - (p.segStarts[12] - 0.2)) < 0.01, 'outro starts with the closing line');
});

test('chapters sit on the chimes and start at 0', () => {
  const p = musicPlan(segs, durs);
  const ch = chaptersWithMusic(segs, p, { 1: { title: 'Paper One.' }, 2: { title: 'Paper Two' } }, t => t.replace(/\.$/, ''));
  assert.deepEqual(ch.map(c => c.title), ['Welcome', 'Paper One', 'Paper Two', 'In brief', 'Close']);
  assert.equal(ch[0].start, 0);
  assert.ok(Math.abs(ch[1].start - (p.segStarts[3] - 0.75)) < 0.01);
  for (let i = 1; i < ch.length; i++) assert.ok(ch[i].start > ch[i - 1].start);
});

test('ffmpeg arguments: one concat of pieces and silences, one amix of speech + overlays', () => {
  const pieces = durs.flatMap((d, si) => (si === 7 ? [{ file: `/t/${si}a.mp3`, si }, { file: `/t/${si}b.mp3`, si }] : [{ file: `/t/${si}.mp3`, si }]));
  const { args, plan } = ffmpegMixArgs({ pieces, segments: segs, segDurations: durs, musicDir: '/m', out: '/t/out.mp3' });
  const fc = args[args.indexOf('-filter_complex') + 1];
  const concatN = Number(fc.match(/concat=n=(\d+)/)[1]);
  const silences = (fc.match(/anullsrc=/g) || []).length;
  assert.equal(concatN, pieces.length + silences, 'every piece and every silence is concatenated');
  assert.match(fc, new RegExp(`amix=inputs=${plan.overlays.length + 1}:normalize=0`));
  assert.ok(args.includes('/m/sting.mp3') && args.includes('/m/turn.mp3') && args.includes('/m/outro.mp3') && args.includes('/m/bed.mp3'));
  assert.ok(fc.includes('volume=-23dB') && fc.includes('afade=t=out'), 'bed is quiet and fades');
  assert.equal(args[args.length - 1], '/t/out.mp3');
  assert.ok(args.includes('alimiter=limit=0.95:level=false') || fc.includes('alimiter'), 'limited');
});

test('a trailer (host only, no papers) still gets sting, a bed and the outro', () => {
  const tsegs = [{ kind: 'trailer', speaker: 'host' }, { kind: 'trailer', speaker: 'host' }, { kind: 'trailer', speaker: 'host' }];
  const p = musicPlan(tsegs, [30, 40, 35]);
  assert.deepEqual(p.overlays.map(o => o.file), ['sting', 'bed', 'outro']);
  assert.ok(p.overlays[1].until <= MUSIC.durations.bed);
  assert.ok(p.overlays[2].at > 90);
});
