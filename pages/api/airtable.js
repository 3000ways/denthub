import { listPublishedResources, listCategories } from '../../lib/resources-db';

export default async function handler(req, res) {
  const { table, logo } = req.query;

  // Logo proxy — Clearbit (high-res) with Google favicon fallback
  if (logo) {
    // Try Clearbit first — returns proper company logos at high resolution
    try {
      const cb = await fetch(
        `https://logo.clearbit.com/${logo}`,
        { headers: { 'User-Agent': 'DentHub/1.0' }, signal: AbortSignal.timeout(4000) }
      );
      if (cb.ok) {
        const buf  = await cb.arrayBuffer();
        const type = cb.headers.get('content-type') || 'image/png';
        res.setHeader('Content-Type', type);
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
        return res.status(200).send(Buffer.from(buf));
      }
    } catch {}

    // Fall back to Google favicon service
    try {
      const r = await fetch(
        `https://www.google.com/s2/favicons?domain=${logo}&sz=128`,
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

  // Content now lives in Supabase (no API-call cap); records keep the exact
  // Airtable shape ({ id, fields }) so every consumer works unchanged.
  const allowed = ['Resources', 'Categories'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'Invalid table' });

  try {
    const records = table === 'Resources'
      ? await listPublishedResources()
      : await listCategories();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ records });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
