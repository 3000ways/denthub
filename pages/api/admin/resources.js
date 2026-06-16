import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

async function airtableRequest(path, options = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable error ${res.status}: ${err}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list all resources
  if (req.method === 'GET') {
    try {
      let records = [];
      let offset;
      do {
        const params = new URLSearchParams({ pageSize: '100' });
        params.append('sort[0][field]', 'Name');
        params.append('sort[0][direction]', 'asc');
        if (offset) params.set('offset', offset);
        const data = await airtableRequest(`?${params}`);
        records = records.concat(data.records);
        offset = data.offset;
      } while (offset);
      return res.status(200).json(records);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — create new resource
  if (req.method === 'POST') {
    try {
      // Category is accepted for backwards-compatibility but no longer stored —
      // the junk "Tags" field it fed has been retired in favor of Specialty /
      // Topic / Goals & Outcomes / Career Stage.
      const { Category, ...rest } = req.body;
      const fields = {
        ...rest,
        Status: 'Published',
        'Submission Status': 'Approved',
        Source: rest.Source || 'Manual',
      };
      const data = await airtableRequest('', {
        method: 'POST',
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
      });
      return res.status(200).json(data.records[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PATCH — update a resource
  if (req.method === 'PATCH') {
    try {
      const { id, fields } = req.body;
      const data = await airtableRequest('', {
        method: 'PATCH',
        body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
      });
      return res.status(200).json(data.records[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — delete a resource
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await airtableRequest(`/${id}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
