// Run: npm test   (node --test tests)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeXmlEntities, fmtCount, parseYouTubeRss, channelStatsFromItem, parseYouTubeUrl, channelIdFromRss, rssUrlFor,
} from '../lib/youtube.js';

test('titles decode XML entities (no more &quot;Cheating&quot;)', () => {
  assert.equal(decodeXmlEntities('&quot;Cheating&quot; With Your Dental Consultant?'), '"Cheating" With Your Dental Consultant?');
  assert.equal(decodeXmlEntities('Root Canals &amp; Crowns — Dr. O&#39;Neil&#x2019;s take'), 'Root Canals & Crowns — Dr. O\'Neil’s take');
  assert.equal(decodeXmlEntities('&lt;3 &apos;em'), "<3 'em");
});

test('decoding is one pass: an escaped entity stays as text', () => {
  assert.equal(decodeXmlEntities('&amp;quot;'), '&quot;');
});

test('unknown or broken entities are left alone', () => {
  assert.equal(decodeXmlEntities('AT&T &bogus; &#0; 5 & 6'), 'AT&T &bogus; &#0; 5 & 6');
  assert.equal(decodeXmlEntities(null), null);
});

test('counts: zero or missing hides the number instead of printing 0', () => {
  assert.equal(fmtCount('0'), null);
  assert.equal(fmtCount(undefined), null);
  assert.equal(fmtCount('71'), '71');
  assert.equal(fmtCount('12345'), '12K');
  assert.equal(fmtCount('2000000'), '2M');
  assert.equal(fmtCount('2350000'), '2.4M');
});

test('a hidden subscriber count is unknown (null), not a fake 0', () => {
  const hidden = channelStatsFromItem({ statistics: { subscriberCount: '0', hiddenSubscriberCount: true, videoCount: '71' } });
  assert.equal(hidden.subscribers, null);
  assert.equal(hidden.subscribersRaw, null);
  assert.equal(hidden.videos, '71');
  assert.equal(hidden.videosRaw, 71);

  const shown = channelStatsFromItem({ statistics: { subscriberCount: '15400', hiddenSubscriberCount: false, videoCount: '300' } });
  assert.equal(shown.subscribers, '15K');
  assert.equal(shown.subscribersRaw, 15400);

  // A real, visible 0 still reaches the scoring engine as 0 but is not displayed.
  const zero = channelStatsFromItem({ statistics: { subscriberCount: '0', hiddenSubscriberCount: false } });
  assert.equal(zero.subscribers, null);
  assert.equal(zero.subscribersRaw, 0);
});

test('parses a YouTube channel feed, newest first, with decoded titles', () => {
  const xml = `<feed>
    <entry><yt:videoId>abc123</yt:videoId><title>&quot;Cheating&quot; With Your Dental Consultant?</title>
      <published>2026-07-12T10:00:00+00:00</published><media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" width="480"/></entry>
    <entry><yt:videoId>def456</yt:videoId><title><![CDATA[Overhead & You]]></title><published>2026-07-10T10:00:00+00:00</published></entry>
    <entry><title>no id, skipped</title></entry>
  </feed>`;
  const v = parseYouTubeRss(xml);
  assert.equal(v.length, 2);
  assert.equal(v[0].title, '"Cheating" With Your Dental Consultant?');
  assert.equal(v[0].url, 'https://www.youtube.com/watch?v=abc123');
  assert.equal(v[0].thumbnail, 'https://i.ytimg.com/vi/abc123/hqdefault.jpg');
  assert.equal(v[0].publishedAt, '2026-07-12T10:00:00+00:00');
  assert.equal(v[1].title, 'Overhead & You');
  assert.equal(v[1].thumbnail, 'https://i.ytimg.com/vi/def456/mqdefault.jpg');
  assert.equal(parseYouTubeRss(xml, 1).length, 1);
  assert.deepEqual(parseYouTubeRss(''), []);
});

test('channel ids and handles come out of URLs', () => {
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/@DentalPracticeConsultingAI'), { handle: 'DentalPracticeConsultingAI', channelId: null });
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/channel/UCfOJjjmNUsy9xf9UooBe2zA'), { handle: null, channelId: 'UCfOJjjmNUsy9xf9UooBe2zA' });
  assert.equal(channelIdFromRss('https://www.youtube.com/feeds/videos.xml?channel_id=UCabc'), 'UCabc');
  assert.equal(rssUrlFor('UCabc'), 'https://www.youtube.com/feeds/videos.xml?channel_id=UCabc');
  assert.equal(rssUrlFor(null), null);
});
