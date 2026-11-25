// Run: npm test   (node --test tests)
import test from 'node:test';
import assert from 'node:assert/strict';
import { booksApiKey, volumesUrl, parseVolume, lookupBook, sweepBooks } from '../lib/google-books.js';

const records = n => Array.from({ length: n }, (_, i) => ({ id: `rec${i}` }));

test('uses the Books key, then the YouTube key, then none', () => {
  assert.equal(booksApiKey({ GOOGLE_BOOKS_API_KEY: 'b', YOUTUBE_API_KEY: 'y' }), 'b');
  assert.equal(booksApiKey({ YOUTUBE_API_KEY: 'y' }), 'y');
  assert.equal(booksApiKey({}), null);
});

test('the key is only added to the address when there is one', () => {
  assert.match(volumesUrl('Dune', 'Herbert', 'k1'), /&key=k1$/);
  assert.doesNotMatch(volumesUrl('Dune', 'Herbert', null), /key=/);
});

test('cover is forced to https with the page curl removed', () => {
  const book = parseVolume({ volumeInfo: { imageLinks: { thumbnail: 'http://books.google.com/c?id=1&edge=curl&zoom=1' }, publishedDate: '2019-05-01' } });
  assert.equal(book.cover, 'https://books.google.com/c?id=1&zoom=1');
  assert.equal(book.year, '2019');
});

test('a refused call throws, with no address in the message; no match is null', async () => {
  const refused = async () => ({ ok: false, status: 429 });
  await assert.rejects(lookupBook('T', 'A', 'secret', refused), e => e.status === 429 && !e.message.includes('secret'));
  const empty = async () => ({ ok: true, json: async () => ({ totalItems: 0 }) });
  assert.equal(await lookupBook('T', 'A', 'k', empty), null);
});

test('a full sweep is complete, even when some books have no match', async () => {
  const { result, complete, failed } = await sweepBooks(records(10), async r => (r.id === 'rec3' ? null : { cover: r.id }));
  assert.equal(Object.keys(result).length, 9);
  assert.equal(failed, 0);
  assert.equal(complete, true);
});

test('a quota refusal stops the sweep and marks it incomplete', async () => {
  let calls = 0;
  const { result, complete } = await sweepBooks(records(261), async () => {
    calls++;
    throw Object.assign(new Error('x'), { status: 429 });
  });
  assert.deepEqual(result, {});
  assert.equal(complete, false);
  assert.ok(calls <= 6, `made ${calls} calls`);
});

test('an occasional network error keeps going but is not complete', async () => {
  const { result, complete, failed } = await sweepBooks(records(10), async r => {
    if (r.id === 'rec2') throw new Error('timeout');
    return { cover: r.id };
  });
  assert.equal(Object.keys(result).length, 9);
  assert.equal(failed, 1);
  assert.equal(complete, false);
});
