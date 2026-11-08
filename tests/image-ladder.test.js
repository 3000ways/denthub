// Run: npm test   (node --test tests)
import test from 'node:test';
import assert from 'node:assert/strict';
import { resourceImages, bookCoverImages, isFaviconSrc, openLibraryCoverSrc } from '../lib/image-ladder.js';

const base = { URL: 'https://www.example.com/show', Name: 'A Show' };

test('walks human image, auto image, favicon in that order', () => {
  assert.deepEqual(
    resourceImages({ ...base, Type: 'Podcast', 'Image URL': 'https://x/h.jpg', 'Auto Image URL': 'https://x/a.jpg' }),
    ['https://x/h.jpg', 'https://x/a.jpg', '/api/airtable?logo=example.com'],
  );
});

test('owner or live images go first and duplicates collapse', () => {
  assert.deepEqual(
    resourceImages({ ...base, 'Image URL': 'https://x/h.jpg' }, { before: ['https://x/o.jpg', 'https://x/h.jpg', null] }),
    ['https://x/o.jpg', 'https://x/h.jpg', '/api/airtable?logo=example.com'],
  );
});

test('books try Open Library before the favicon; book cards skip the favicon', () => {
  const book = { ...base, Type: 'Book', Name: 'Pathways of the Pulp', 'Image URL': 'https://x/h.jpg' };
  const cover = openLibraryCoverSrc(book.Name);
  assert.ok(cover.endsWith('Pathways%20of%20the%20Pulp-M.jpg?default=false'));
  assert.deepEqual(resourceImages(book), ['https://x/h.jpg', cover, '/api/airtable?logo=example.com']);
  assert.deepEqual(bookCoverImages(book), ['https://x/h.jpg', cover]);
});

test('YouTube channels try the channel avatar before the YouTube favicon', () => {
  const list = resourceImages({ Type: 'YouTube', URL: 'https://www.youtube.com/@endo' });
  assert.equal(list[0], '/api/youtube-thumb?url=https%3A%2F%2Fwww.youtube.com%2F%40endo');
  assert.ok(isFaviconSrc(list[1]));
});

test('no images and no usable URL leaves nothing to try', () => {
  assert.deepEqual(resourceImages({ URL: 'not a url' }), []);
  assert.deepEqual(resourceImages(null), []);
});
