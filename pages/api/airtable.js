export default async function handler(req, res) {
  const { table, logo } = req.query;
  const PAT  = process.env.AIRTABLE_PAT;
  const BASE = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';

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
