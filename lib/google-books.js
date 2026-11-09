// Google Books lookups for the Book listings (cover, year, pages, publisher,
// ratings). Kept apart from the API route so the sweep logic can be unit-tested.
//
// Google refuses keyless calls (HTTP 429), so a key is required in practice:
// GOOGLE_BOOKS_API_KEY if set, otherwise the existing YouTube key, which works
// once the Books API is enabled on the same Google Cloud project.

const VOLUMES_URL = 'https://www.googleapis.com/books/v1/volumes';

export function booksApiKey(env = process.env) {
  return env.GOOGLE_BOOKS_API_KEY || env.YOUTUBE_API_KEY || null;
}

export function volumesUrl(title, author, key) {
  // Title + author gives the most precise match.
  const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);
  return `${VOLUMES_URL}?q=${q}&maxResults=1&printType=books${key ? `&key=${encodeURIComponent(key)}` : ''}`;
}

export function parseVolume(item) {
  const info = item?.volumeInfo;
  if (!info) return null;

  // zoom=1 is a decent size. Force https and drop the page-curl effect.
  const rawThumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
  const cover = rawThumb
    ? rawThumb.replace('http://', 'https://').replace('&edge=curl', '').replace('?edge=curl', '')
    : null;

  return {
    cover,
    description: info.description ? info.description.slice(0, 300) : null,
    pages:       info.pageCount   || null,
    year:        info.publishedDate ? info.publishedDate.slice(0, 4) : null,
    publisher:   info.publisher   || null,
    isbn:        info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier || null,
    // Popularity signals for the scoring engine (often sparse on Google Books).
    ratingsCount:  info.ratingsCount  || 0,
    averageRating: info.averageRating || null,
  };
}

// Returns the book's data, or null when Google has no match. Throws on any
// failed call, so "no such book" and "Google refused" are never confused. The
// error carries only the status: the URL contains the key and must not be logged.
export async function lookupBook(title, author, key, fetchImpl = fetch) {
  const res = await fetchImpl(volumesUrl(title, author, key), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Object.assign(new Error(`Google Books HTTP ${res.status}`), { status: res.status });
  const data = await res.json();
  return data.items?.[0] ? parseVolume(data.items[0]) : null;
}

// Look up every record a few at a time, stopping at the first quota or key
// refusal (429/403) instead of spending the rest of the list on calls that
// will also be refused. `complete` is false if anything went unanswered.
export async function sweepBooks(records, lookup, { concurrency = 6, deadlineMs = 45000 } = {}) {
  const result = {};
  const deadline = Date.now() + deadlineMs;
  let next = 0;
  let failed = 0;
  let stopped = false;

  async function worker() {
    while (!stopped && next < records.length && Date.now() < deadline) {
      const record = records[next++];
      try {
        const data = await lookup(record);
        if (data) result[record.id] = data;
      } catch (e) {
        failed++;
        if (e.status === 429 || e.status === 403) stopped = true;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { result, failed, complete: failed === 0 && next >= records.length };
}
