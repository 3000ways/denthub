import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

function normalizeUrl(url) {
  if (!url) return '';
  try {
    let u = url.trim().toLowerCase();
    u = u.replace(/^https?:\/\//, '');
    u = u.replace(/^www\./, '');
    u = u.split('#')[0];
    const qIdx = u.indexOf('?');
    if (qIdx !== -1) {
      const base = u.slice(0, qIdx);
      const rawParams = u.slice(qIdx + 1);
      const keep = [];
      for (const pair of rawParams.split('&')) {
        const [k] = pair.split('=');
        if (k && !k.startsWith('utm_') && !['ref', 'source', 'fbclid', 'gclid'].includes(k)) {
          keep.push(pair);
        }
      }
      u = keep.length > 0 ? `${base}?${keep.join('&')}` : base;
    }
    return u.replace(/\/$/, '');
  } catch {
    return url.toLowerCase().trim();
  }
}

function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/^the\s+/, '');
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).end();

  try {
    let records = [];
    let offset;
    do {
      const params = new URLSearchParams({ pageSize: '100' });
      params.append('sort[0][field]', 'Name');
      params.append('sort[0][direction]', 'asc');
      if (offset) params.set('offset', offset);
      const resp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
      });
      if (!resp.ok) throw new Error(`Airtable ${resp.status}`);
      const data = await resp.json();
      records = records.concat(data.records);
      offset = data.offset;
    } while (offset);

    const byUrl = new Map();
    for (const r of records) {
      const url = normalizeUrl(r.fields['URL']);
      if (!url) continue;
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push(r);
    }

    const byName = new Map();
    for (const r of records) {
      const name = normalizeName(r.fields['Name']);
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(r);
    }

    const seen = new Set();
    const groups = [];

    for (const [url, recs] of byUrl) {
      if (recs.length < 2) continue;
      const key = recs.map(r => r.id).sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({ reason: 'Same URL', matchValue: url, records: recs });
    }

    for (const [name, recs] of byName) {
      if (recs.length < 2) continue;
      const key = recs.map(r => r.id).sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      groups.push({ reason: 'Same name', matchValue: name, records: recs });
    }

    return res.status(200).json({ groups, total: records.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
