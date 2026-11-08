import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyScript, buildTrailerScript, shortVersion, spokenAuthors, spokenDate, chaptersFrom, sonioxCostCents, estimateSeconds, readModeFor, licenceLabel, licenceUrl, showNotes } from '../lib/briefing-script.js';

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

test('weekly script, hybrid format: all-rights-reserved papers get our summary + the authors\' quoted conclusion', () => {
  const a1 = { ...article(1, 'Root Resection Outcomes.', 'J Endod', 'No significant difference was found.'), read_mode: 'hybrid', summary: 'The authors pooled fourteen studies on root resection and compared outcomes between endodontic and periodontal indications.' };
  const a2 = { ...article(2, 'Generative AI in Endodontics', 'Int Endod J', 'Performance depends on task type.'), read_mode: 'quote_only' };
  const extra = article(3, 'A Third Paper', 'Eur Endod J', 'Heating improved dissolution.');
  const seg = buildWeeklyScript({ show: 'Endodontics This Week', label: 'endodontics', weekOf: '2026-11-09', fullReads: [a1, a2], headlines: [extra], spokenName: abbr => ({ 'J Endod': 'the J-O-E', 'Int Endod J': 'the I-E-J', 'Eur Endod J': 'the European Endo Journal' }[abbr]) });
  assert.equal(seg[0].kind, 'welcome');
  assert.match(seg[0].text, /Welcome to Endodontics This Week/);
  assert.match(seg[0].text, /3 new papers from the J-O-E, the I-E-J, and the European Endo Journal, 2 covered in depth, in about \d+ minutes\. You drive\. We read\./);
  assert.equal(seg[1].kind, 'disclosure');
  assert.match(seg[1].text, /in our own words, then quote the authors' conclusion/);
  assert.match(seg[1].text, /isn't affiliated with any journal/);
  assert.match(seg[2].text, /Today's headline: Root Resection Outcomes, from the J-O-E\. Also this week: Generative AI in Endodontics, from the I-E-J\. And 1 more\./);
  // no abstract text is spoken for a hybrid paper
  assert.ok(!seg.some(s => s.kind === 'abstract'), 'no verbatim abstract segments');
  assert.ok(!seg.some(s => /Fourteen studies were included/.test(s.text)), 'abstract wording never spoken');
  const handoffs = seg.filter(s => s.kind === 'handoff');
  assert.match(handoffs[0].text, /^First up: Root Resection Outcomes, from the J-O-E, by Sabeti and colleagues\. Adrian, take it away\.$/);
  assert.match(handoffs[1].text, /^And finally: Generative AI in Endodontics/);
  const summaries = seg.filter(s => s.kind === 'summary');
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].speaker, 'reader');
  assert.equal(summaries[0].text, a1.summary);
  const quotes = seg.filter(s => s.kind === 'quote');
  assert.equal(quotes[0].text, "In the authors' own words: No significant difference was found.");
  assert.equal(quotes[1].text, 'The authors conclude: Performance depends on task type.');   // quote_only fallback
  const slots = seg.filter(s => s.kind === 'headline_slot');
  assert.equal(slots.length, 2);
  assert.match(slots[1].text, /A Third Paper, from the European Endo Journal\. The authors conclude: Heating improved dissolution\./);
  assert.equal(seg[seg.length - 1].kind, 'close');
  assert.match(seg[seg.length - 1].text, /Safe drive\.$/);
  assert.ok(seg.every(s => !/https?:/.test(s.text)), 'no links in any spoken line');
});

test('weekly script, verbatim mode: open-access abstracts are read as published, ND ones flagged for strip-only cleaning', () => {
  const a1 = { ...article(1, 'Open Paper', 'Int Endod J', 'No significant difference was found.'), read_mode: 'verbatim', oa_license: 'cc-by' };
  const a2 = { ...article(2, 'ND Paper', 'J Endod', 'Performance depends on task type.'), read_mode: 'verbatim_nd', oa_license: 'cc-by-nc-nd' };
  const seg = buildWeeklyScript({ show: 'Endodontics This Week', label: 'endodontics', weekOf: '2026-11-09', fullReads: [a1, a2], headlines: [], spokenName: abbr => ({ 'J Endod': 'the J-O-E', 'Int Endod J': 'the I-E-J' }[abbr]) });
  const handoffs = seg.filter(s => s.kind === 'handoff');
  assert.match(handoffs[0].text, /open access under a Creative Commons licence, so Adrian reads the abstract as published/);
  const abstracts = seg.filter(s => s.kind === 'abstract');
  assert.ok(abstracts.some(s => s.text === 'Fourteen studies were included (n = 1,236).'), 'abstract text is verbatim');
  assert.ok(abstracts.filter(s => s.article_id === 1).every(s => !s.nd));
  assert.ok(abstracts.filter(s => s.article_id === 2).every(s => s.nd === true), 'ND abstract segments carry the nd flag');
  const svs = seg.filter(s => s.kind === 'short_version');
  assert.equal(svs[0].text, 'The short version: No significant difference was found.');
  assert.match(seg[0].text, /2 new papers from the I-E-J and the J-O-E, in about \d+ minutes/);   // all in depth → no "covered in depth" clause
});

test('read mode follows the licence and only trusts publisher-hosted copies', () => {
  assert.equal(readModeFor({ oa_status: 'open', oa_license: 'cc-by', oa_host_type: 'publisher' }), 'verbatim');
  assert.equal(readModeFor({ oa_status: 'open', oa_license: 'cc-by-nc', oa_host_type: 'publisher' }), 'verbatim');
  assert.equal(readModeFor({ oa_status: 'open', oa_license: 'cc-by-nc-nd', oa_host_type: 'publisher' }), 'verbatim_nd');
  assert.equal(readModeFor({ oa_status: 'open', oa_license: 'cc-by', oa_host_type: 'repository' }), 'hybrid');
  assert.equal(readModeFor({ oa_status: 'open', oa_license: null, oa_host_type: 'publisher' }), 'hybrid');
  assert.equal(readModeFor({ oa_status: 'none' }), 'hybrid');
  assert.equal(readModeFor({}), 'hybrid');
  assert.equal(licenceLabel('cc-by-nc-nd'), 'CC BY NC ND');
  assert.equal(licenceUrl('cc-by'), 'https://creativecommons.org/licenses/by/');
});

test('show notes say how each paper was covered and carry the credits', () => {
  const a1 = { ...article(1, 'Open Paper', 'Int Endod J', 'x.'), read_mode: 'verbatim', oa_license: 'cc-by', url: 'https://doi.org/10.1/x', journal_name: 'International Endodontic Journal' };
  const a2 = { ...article(2, 'Closed Paper', 'J Endod', 'y.'), read_mode: 'hybrid', url: 'https://doi.org/10.1/y', journal_name: 'Journal of Endodontics' };
  const notes = showNotes({ show: 'Endodontics This Week', weekOf: '2026-11-09', fullReads: [a1, a2], headlines: [] });
  assert.match(notes, /1\. Open Paper — Sabeti and colleagues\. International Endodontic Journal\. https:\/\/doi\.org\/10\.1\/x Open access \(CC BY, https:\/\/creativecommons\.org\/licenses\/by\/\): abstract read as published\./);
  assert.match(notes, /2\. Closed Paper — .* Summary in our words; conclusion quoted from the abstract\./);
  assert.match(notes, /Not affiliated with or endorsed by any journal or publisher/);
  assert.match(notes, /National Library of Medicine/);
  assert.match(notes, /hello@thedentalcommute\.com/);
});

test('trailer is host only and names the journals', () => {
  const seg = buildTrailerScript({ show: 'Endodontics This Week', label: 'endodontics', journalNames: ['the Journal of Endodontics', 'the International Endodontic Journal', 'the European Endodontic Journal'] });
  assert.ok(seg.every(s => s.speaker === 'host'));
  assert.match(seg[1].text, /the Journal of Endodontics, the International Endodontic Journal, and the European Endodontic Journal/);
  assert.match(seg[1].text, /in our own words/);
  assert.ok(!seg.some(x => /advice/.test(x.text)), 'no clinical-advice disclaimer (owner rule)');
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
