import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPieces, splitPieces, pieceHash, PIECE_MAX } from '../lib/briefing-pieces.js';

test('pieces: section headings prefixed, ND segments cleaned strip-only, links never survive', () => {
  const script = [
    { kind: 'handoff', speaker: 'host', text: 'First up: a paper. See https://example.com for details.' },
    { kind: 'abstract', speaker: 'reader', label: 'RESULTS', text: 'Success was 92% (p < 0.05).' },
    { kind: 'abstract', speaker: 'reader', label: 'RESULTS', text: 'Success was 92% (p < 0.05).', nd: true },
  ];
  const { pieces, removed } = buildPieces(script, { pronunciations: [] });
  assert.equal(pieces[0].voice, 'Grace');
  assert.ok(!/https?:/.test(pieces[0].text));
  assert.equal(removed[0].segment, 0);
  assert.match(pieces[1].text, /^Results\. Success was 92% \(p less than point oh five\)/);
  assert.match(pieces[2].text, /^Results\. Success was 92% \(p < 0\.05\)/, 'ND segment keeps the statistics as written');
  assert.equal(pieces[1].voice, 'Adrian');
});

test('long text splits at sentence boundaries under the cap; hashes are stable', () => {
  const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} is here and it has some length to it.`).join(' ');
  const parts = splitPieces(long);
  assert.ok(parts.length > 1);
  assert.ok(parts.every(p => p.length <= PIECE_MAX));
  assert.equal(parts.join(' '), long);
  assert.equal(pieceHash({ voice: 'Grace', text: 'Hello.' }), pieceHash({ voice: 'Grace', text: 'Hello.' }));
  assert.notEqual(pieceHash({ voice: 'Grace', text: 'Hello.' }), pieceHash({ voice: 'Adrian', text: 'Hello.' }));
});
