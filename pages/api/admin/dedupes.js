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

// Catches similar names missed by exact match — e.g. "Thriving Dentist Show" vs
// "Thriving Dentist Show (Student & New Dentist Content)". Returns true if ≥75%
// of the shorter name's significant words appear in the longer name.
function fuzzyMatchNames(a, b) {
  const stopWords = new Set(['the', 'a', 'an', 'with', 'for', 'of', 'and', 'in', 'on', 'by', 'to', 'at', 'from']);
  function keywords(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }
  const wa = keywords(a);
  const wb = keywords(b);
  if (wa.length < 2 || wb.length < 2) return false;
  const setA = new Set(wa);
  const setB = new Set(wb);
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  const overlap = [...smaller].filter(w => larger.has(w)).length;
  return overlap / smaller.size >= 0.75;
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

    const seen = new Set();
    const groups = [];

    // Pass 1: exact URL match — only flag pairs whose names are also similar.
    // Two resources sharing a URL but with clearly different names are likely
    // different resources hosted at the same organization page (e.g. two AAP
    // podcasts both linking to perio.org/research-science/podcasts/).
    const byUrl = new Map();
    for (const r of records) {
      const url = normalizeUrl(r.fields['URL']);
      if (!url) continue;
      if (!byUrl.has(url)) byUrl.set(url, []);
      byUrl.get(url).push(r);
    }
    for (const [url, recs] of byUrl) {
      if (recs.length < 2) continue;
      // Compare all pairs; only keep pairs whose names match (exact or fuzzy)
      for (let i = 0; i < recs.length; i++) {
        for (let j = i + 1; j < recs.length; j++) {
          const nameA = normalizeName(recs[i].fields['Name'] || '');
          const nameB = normalizeName(recs[j].fields['Name'] || '');
          const namesMatch = nameA === nameB || fuzzyMatchNames(nameA, nameB);
          if (!namesMatch) continue;
          const key = [recs[i].id, recs[j].id].sort().join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          groups.push({ reason: 'Same URL', matchValue: url, records: [recs[i], recs[j]] });
        }
      }
    }

    // Pass 2: exact name match (after normalization)
    // Skip pairs with different Types — same name, different format (e.g. a podcast
    // and a YouTube channel) are different resources, not duplicates.
    const byName = new Map();
    for (const r of records) {
      const name = normalizeName(r.fields['Name']);
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(r);
    }
    for (const [name, recs] of byName) {
      if (recs.length < 2) continue;
      // Group by type so we only compare same-type records
      const byType = new Map();
      for (const r of recs) {
        const t = r.fields['Type'] || '';
        if (!byType.has(t)) byType.set(t, []);
        byType.get(t).push(r);
      }
      for (const [, sameTypeRecs] of byType) {
        if (sameTypeRecs.length < 2) continue;
        const key = sameTypeRecs.map(r => r.id).sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        groups.push({ reason: 'Same name', matchValue: name, records: sameTypeRecs });
      }
    }

    // Pass 3: fuzzy name match — catches e.g. "Thriving Dentist Show" vs
    // "Thriving Dentist Show (Student & New Dentist Content)"
    // Also skips pairs with different Types for the same reason as Pass 2.
    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const nameA = records[i].fields['Name'];
        const nameB = records[j].fields['Name'];
        if (!nameA || !nameB) continue;
        const typeA = records[i].fields['Type'] || '';
        const typeB = records[j].fields['Type'] || '';
        if (typeA && typeB && typeA !== typeB) continue;
        if (!fuzzyMatchNames(nameA, nameB)) continue;
        const key = [records[i].id, records[j].id].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        groups.push({
          reason: 'Similar name',
          matchValue: `"${nameA}" / "${nameB}"`,
          records: [records[i], records[j]],
        });
      }
    }

    return res.status(200).json({ groups, total: records.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
