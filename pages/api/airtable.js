export default async function handler(req, res) {
  const { table, logo, cover } = req.query;
  const PAT  = process.env.AIRTABLE_PAT;
  const BASE = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';

  // Book cover proxy — tries Google Books, falls back to Open Library
  if (cover) {
    try {
      // Try Google Books first
      const q = encodeURIComponent(cover);
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`,
        { headers: { 'User-Agent': 'DentHub/1.0' } }
      );
      const gbData = await gbRes.json();
      const thumbnail = gbData?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
                     || gbData?.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail;

      if (thumbnail) {
        const imgUrl = thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
          return res.status(200).send(Buffer.from(buf));
        }
      }

      // Fallback: Open Library covers API
      const olRes = await fetch(
        `https://openlibrary.org/search.json?title=${q}&limit=1&fields=cover_i`,
        { headers: { 'User-Agent': 'DentHub/1.0' } }
      );
      const olData = await olRes.json();
      const coverId = olData?.docs?.[0]?.cover_i;

      if (coverId) {
        const olImgRes = await fetch(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`);
        if (olImgRes.ok) {
          const buf = await olImgRes.arrayBuffer();
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
          return res.status(200).send(Buffer.from(buf));
        }
      }

      return res.status(404).end();
    } catch (e) {
      return res.status(404).end();
    }
  }

  // Logo proxy — Google favicon service
  if (logo) {
    try {
      const r = await fetch(
        `https://www.google.com/s2/favicons?domain=${logo}&sz=64`,
        { headers: { 'User-Agent': 'DentHub/1.0' } }
      );
      if (!r.ok) return res.status(404).end();
      const buf  = await r.arrayBuffer();
      const type = r.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
      return res.status(200).send(Buffer.from(buf));
    } catch {
      return res.status(404).end();
    }
  }

  if (!PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  const allowed = ['Resources', 'Categories', 'Votes'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

  const params = new URLSearchParams();
  if (table === 'Resources') {
    params.set('filterByFormula', "{Status}='Published'");
    params.set('sort[0][field]', 'Final Score');
    params.set('sort[0][direction]', 'desc');
  }
  if (table === 'Categories') {
    params.set('sort[0][field]', 'Display Order');
    params.set('sort[0][direction]', 'asc');
  }

  try {
    const url = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?${params.toString()}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
