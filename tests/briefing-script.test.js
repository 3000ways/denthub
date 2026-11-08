import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyScript, buildTrailerScript, shortVersion, spokenAuthors, spokenDate, chaptersFrom, sonioxCostCents, estimateSeconds } from '../lib/briefing-script.js';

const article = (id, title, journal, concl) => ({
  id, title, journal_abbr: journal, authors: ['Mohammad A Sabeti', 'Ashley Wang', 'Third Author'],
  abstract: [
    { label: 'INTRODUCTION', text: 'Root resection is performed for endodontic or periodontal reasons.' },
    { label: 'METHODS', text: 'A systematic review was conducted.' },
    { label: 'RESULTS', text: 'Fourteen studies were included (n = 1,236).' },
    { label: 'CONCLUSIONS', text: concl },
  ],
});

test('spoken helpers', () => {
  assert.equal(spokenAuthors(['Mohammad A Sabeti', 'Ashley Wang']), 'Sabeti and Wang');
  assert.equal(spokenAuthors(['Mohammad A Sabeti', 'Ashley Wang', 'C D']), 'Sabeti and colleagues');
  assert.equal(spokenAuthors(['Only One']), 'One');
  assert.equal(spokenDate('2026-11-09'), 'November 9th, 2026');
  assert.equal(spokenDate('2026-11-23'), 'November 23rd, 2026');
});

test('short version is the first sentence of the conclusions', () => {
  const sv = shortVersion(article(1, 't', 'J Endod', 'Available evidence does not demonstrate a difference. The estimate is fragile.').abstract);
  assert.equal(sv, 'Available evidence does not demonstrate a difference.');
});

test('weekly script: host and reader alternate, abstracts verbatim, welcome states count and minutes', () => {
  const a1 = article(1, 'Root Resection Outcomes.', 'J Endod', 'No significant difference was found.');
  const a2 = article(2, 'Generative AI in Endodontics', 'Int Endod J', 'Performance depends on task type.');
  const extra = article(3, 'A Third Paper', 'Eur Endod J', 'Heating improved dissolution.');
  const seg = buildWeeklyScript({ show: 'Endodontics This Week', label: 'endodontics', weekOf: '2026-11-09', fullReads: [a1, a2], headlines: [extra], spokenName: abbr => ({ 'J Endod': 'the J-O-E', 'Int Endod J': 'the I-E-J', 'Eur Endod J': 'the European Endo Journal' }[abbr]) });
  assert.equal(seg[0].kind, 'welcome');
  assert.match(seg[0].text, /Welcome to Endodontics This Week/);
  assert.match(seg[0].text, /3 new papers from the J-O-E, the I-E-J, and the European Endo Journal, 2 read in full, about \d+ minutes/);
  assert.equal(seg[1].kind, 'disclosure');
  assert.match(seg[2].text, /Today's headline: Root Resection Outcomes, from the J-O-E\. Also this week: Generative AI in Endodontics, from the I-E-J\. And 1 more\./);
  const readerText = seg.filter(s => s.speaker === 'reader').map(s => s.text);
  assert.ok(readerText.includes('Fourteen studies were included (n = 1,236).'), 'abstract text is verbatim');
  const handoffs = seg.filter(s => s.kind === 'handoff');
  assert.match(handoffs[0].text, /^First, Root Resection Outcomes, from the J-O-E, by Sabeti and colleagues\. Adrian has the abstract\.$/);
  assert.match(handoffs[1].text, /^And finally, Generative AI in Endodontics/);
  const svs = seg.filter(s => s.kind === 'short_version');
  assert.equal(svs[0].text, 'The short version: No significant difference was found.');
  const slots = seg.filter(s => s.kind === 'headline_slot');
  assert.equal(slots.length, 2);
  assert.match(slots[1].text, /A Third Paper, from the European Endo Journal\. Heating improved dissolution\./);
  assert.equal(seg[seg.length - 1].kind, 'close');
  assert.match(seg[seg.length - 1].text, /Safe drive\.$/);
  assert.ok(seg.every(s => !/https?:/.test(s.text)), 'no links in any spoken line');
});

test('trailer is host only and names the journals', () => {
  const seg = buildTrailerScript({ show: 'Endodontics This Week', label: 'endodontics', journalNames: ['the Journal of Endodontics', 'the International Endodontic Journal', 'the European Endodontic Journal'] });
  assert.ok(seg.every(s => s.speaker === 'host'));
  assert.match(seg[1].text, /the Journal of Endodontics, the International Endodontic Journal, and the European Endodontic Journal/);
  assert.ok(estimateSeconds(seg) > 50 && estimateSeconds(seg) < 150);
});

test('chapters start at each paper hand-off', () => {
  const seg = [
    { kind: 'welcome', speaker: 'host' }, { kind: 'disclosure', speaker: 'host' }, { kind: 'headlines', speaker: 'host' },
    { kind: 'handoff', speaker: 'host', article_id: 1 }, { kind: 'abstract', speaker: 'reader', article_id: 1 }, { kind: 'short_version', speaker: 'host', article_id: 1 },
    { kind: 'handoff', speaker: 'host', article_id: 2 }, { kind: 'abstract', speaker: 'reader', article_id: 2 },
    { kind: 'headline_slot', speaker: 'host' }, { kind: 'headline_slot', speaker: 'host', article_id: 3 },
    { kind: 'close', speaker: 'host' },
  ];
  const ch = chaptersFrom(seg, [10, 8, 20, 5, 100, 6, 5, 90, 4, 20, 8], { 1: { title: 'Paper One.' }, 2: { title: 'Paper Two' } });
  assert.deepEqual(ch.map(c => [c.title, c.start]), [['Welcome', 0], ['Paper One', 38], ['Paper Two', 149], ['In brief', 244], ['Close', 268]]);
});

test('cost formula matches the published prices', () => {
  // 1 hour of audio from ~40,000 chars: 12,000 input tokens ($0.048) + 30,000 output tokens ($0.645)
  const cents = sonioxCostCents({ chars: 40000, audioSeconds: 3600 });
  assert.ok(Math.abs(cents - 69.3) < 0.5, `got ${cents}`);
});
