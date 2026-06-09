// Fetches book metadata from Google Books API for all Book resources in Airtable.
// For each book, retrieves: cover image, description, page count, published year, publisher.
// Cached for 24 hours (books don't change often).

const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const AIRTABLE_PAT   = process.env.AIRTABLE_PAT;

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function lookupBook(title, author) {
  // Build query — title + author gives the most precise match
  const q = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();

  const item = data.items?.[0];
  if (!item) return null;

  const info = item.volumeInfo || {};

  // Google Books provides covers at different zoom levels — zoom=1 is a decent size
  const rawThumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
  // Strip the http:// to https:// and remove the edge=curl param that distorts the image
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
  };
}

export default async function handler(req, res) {
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cache);
  }

  if (!AIRTABLE_PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  // 1. Fetch all Book records from Airtable
  const params = new URLSearchParams();
  params.set('filterByFormula', `{Type} = "Book"`);
  const atRes = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!atRes.ok) return res.status(500).json({ error: `Airtable ${atRes.status}` });
  const atJson  = await atRes.json();
  const records = atJson.records || [];

  // 2. Look up each book on Google Books in parallel
  const results = await Promise.allSettled(
    records.map(r => lookupBook(r.fields['Name'], r.fields['Host or Author']))
  );

  // 3. Build result map keyed by Airtable record ID
  const result = {};
  records.forEach((r, i) => {
    const data = results[i].status === 'fulfilled' ? results[i].value : null;
    if (data) result[r.id] = data;
  });

  cache     = result;
  cacheTime = Date.now();

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json(result);
}
