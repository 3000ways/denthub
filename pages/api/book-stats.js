// Fetches book metadata from Google Books API for all Book resources.
// For each book, retrieves: cover image, description, page count, published year, publisher.
// Cached for 24 hours (books don't change often). An incomplete sweep (Google
// refused or timed out) is only held for 5 minutes, so a bad moment can't blank
// the covers for a whole day.

import { listPublishedResources } from '../../lib/resources-db';
import { setCdnCache } from '../../lib/cdn-cache';
import { booksApiKey, lookupBook, sweepBooks } from '../../lib/google-books';

let cache         = null;
let cacheTime     = 0;
let cacheComplete = false;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RETRY_TTL = 5 * 60 * 1000;       // 5 minutes after an incomplete sweep

export default async function handler(req, res) {
  const ttl = cacheComplete ? CACHE_TTL : RETRY_TTL;
  if (cache && Date.now() - cacheTime < ttl) {
    setCdnCache(res, ttl / 1000, { ageMs: Date.now() - cacheTime, ...(cacheComplete ? {} : { staleSec: 300 }) });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  // 1. Fetch all published Book records
  let records;
  try {
    records = await listPublishedResources({ type: 'Book', select: 'id, name, host_or_author' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // 2. Look up each book on Google Books, a few at a time
  const key = booksApiKey();
  const { result, complete } = await sweepBooks(records, r => lookupBook(r.fields['Name'], r.fields['Host or Author'], key));

  // 3. An incomplete sweep keeps whatever this instance already knew
  cache         = complete ? result : { ...(cache || {}), ...result };
  cacheTime     = Date.now();
  cacheComplete = complete;

  if (complete) setCdnCache(res, 86400);
  else setCdnCache(res, 300, { staleSec: 300 });
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(cache);
}
