import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedXml, esc, notesHtml } from '../lib/podcast-feed.js';
import { CLUSTERS } from '../lib/journals.js';

const endo = CLUSTERS.find(c => c.key === 'endo');
const items = [
  { id: 12, kind: 'weekly', week_of: '2026-11-09', title: 'Week of Nov 9: Root resection & more', audio_url: 'https://x.supabase.co/storage/v1/object/public/briefings/episodes/endo/weekly-2026-11-09-12.mp3', audio_bytes: 12345678, duration_seconds: 1750, chapters: [{ title: 'Welcome', start: 0 }, { title: 'Paper <1>', start: 40 }], published_at: '2026-11-09T10:30:00Z', notes: 'Line one\n\n1. Paper A — Smith. https://doi.org/10.1/x Summary in our words.' },
  { id: 11, kind: 'trailer', week_of: '2026-11-09', title: 'Trailer: what Endodontics This Week is', audio_url: 'https://x/a.mp3', audio_bytes: 2000000, duration_seconds: 131, chapters: [{ title: 'Trailer', start: 0 }], published_at: '2026-11-08T20:00:00Z', notes: '' },
];

test('feed has the channel fields Apple and Spotify require, escaped', () => {
  const xml = buildFeedXml({ show: endo, row: { feed_guid: '123e4567-e89b-12d3-a456-426614174000' }, items });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<itunes:owner><itunes:name>The Dental Commute<\/itunes:name><itunes:email>hello@thedentalcommute\.com<\/itunes:email><\/itunes:owner>/);
  assert.match(xml, /<itunes:image href="https:\/\/thedentalcommute\.com\/podcast\/endo\.png"\/>/);
  assert.match(xml, /<itunes:category text="Health &amp; Fitness"><itunes:category text="Medicine"\/><\/itunes:category>/);
  assert.match(xml, /<itunes:explicit>false<\/itunes:explicit>/);
  assert.match(xml, /<atom:link href="https:\/\/thedentalcommute\.com\/api\/podcast\/endo\.xml" rel="self"/);
  assert.match(xml, /<podcast:guid>123e4567-e89b-12d3-a456-426614174000<\/podcast:guid>/);
  assert.match(xml, /<link>https:\/\/thedentalcommute\.com\/journals\/endo<\/link>/);
});

test('items carry enclosure length, duration, episode type, chapters and a stable guid', () => {
  const xml = buildFeedXml({ show: endo, row: null, items });
  assert.match(xml, /<title>Week of Nov 9: Root resection &amp; more<\/title>/, 'ampersand escaped');
  assert.match(xml, /<guid isPermaLink="false">tdc:briefing:12<\/guid>/);
  assert.match(xml, /<enclosure url="https:\/\/x\.supabase\.co[^"]+weekly-2026-11-09-12\.mp3" length="12345678" type="audio\/mpeg"\/>/);
  assert.match(xml, /<itunes:duration>1750<\/itunes:duration>/);
  assert.match(xml, /<itunes:episodeType>full<\/itunes:episodeType>/);
  assert.match(xml, /<itunes:episodeType>trailer<\/itunes:episodeType>/);
  assert.match(xml, /<podcast:chapters url="https:\/\/x\.supabase\.co[^"]+weekly-2026-11-09-12\.chapters\.json" type="application\/json\+chapters"\/>/);
  assert.ok(!/<podcast:chapters url="https:\/\/x\/a\.chapters/.test(xml), 'single-chapter trailer gets no chapters tag');
  assert.match(xml, /<pubDate>Mon, 09 Nov 2026 10:30:00 GMT<\/pubDate>/);
  assert.match(xml, /<description><!\[CDATA\[<p>Line one<\/p><p>1\. Paper A — Smith\. <a href="https:\/\/doi\.org\/10\.1\/x">https:\/\/doi\.org\/10\.1\/x<\/a> Summary in our words\.<\/p>\]\]><\/description>/);
  // no raw ampersands or angle brackets outside tags/CDATA
  const body = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<[^>]+>/g, '');
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|#)/.test(body), 'all ampersands escaped');
  assert.ok(!/[<>]/.test(body), 'no stray angle brackets in text');
});

test('helpers', () => {
  assert.equal(esc('a < b & "c"'), 'a &lt; b &amp; &quot;c&quot;');
  assert.equal(notesHtml('x\n\ny'), '<p>x</p><p>y</p>');
});
