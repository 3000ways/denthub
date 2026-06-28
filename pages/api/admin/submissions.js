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

  // GET — list all pending submissions (paginate through all pages)
  if (req.method === 'GET') {
    try {
      const allRecords = [];
      let offset = null;
      do {
        const params = new URLSearchParams({ filterByFormula: `{Submission Status}="Pending"`, pageSize: '100' });
        if (offset) params.set('offset', offset);
        const data = await airtableRequest(`?${params}`);
        allRecords.push(...(data.records || []));
        offset = data.offset || null;
      } while (offset);

      allRecords.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
      return res.status(200).json(allRecords);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PATCH — approve or reject a single record, or approve all pending
  if (req.method === 'PATCH') {
    try {
      const { id, action, approveAll } = req.body;

      if (approveAll) {
        // Fetch all pending IDs then batch-approve in groups of 10 (Airtable limit)
        const allIds = [];
        let offset = null;
        do {
          const params = new URLSearchParams({ filterByFormula: `{Submission Status}="Pending"`, fields: ['Name'], pageSize: '100' });
          if (offset) params.set('offset', offset);
          const data = await airtableRequest(`?${params}`);
          allIds.push(...(data.records || []).map(r => r.id));
          offset = data.offset || null;
        } while (offset);

        const fields = { 'Submission Status': 'Approved', Status: 'Published' };
        const batches = [];
        for (let i = 0; i < allIds.length; i += 10) {
          batches.push(allIds.slice(i, i + 10));
        }
        await Promise.all(batches.map(batch =>
          airtableRequest('', {
            method: 'PATCH',
            body: JSON.stringify({ records: batch.map(rid => ({ id: rid, fields })), typecast: true }),
          })
        ));
        return res.status(200).json({ approved: allIds.length });
      }

      // Single record
      const fields = {
        'Submission Status': action === 'approve' ? 'Approved' : 'Rejected',
        ...(action === 'approve' ? { Status: 'Published' } : {}),
      };
      const data = await airtableRequest('', {
        method: 'PATCH',
        body: JSON.stringify({ records: [{ id, fields }], typecast: true }),
      });
      return res.status(200).json(data.records[0]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
