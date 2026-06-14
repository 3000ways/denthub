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

  // GET — list pending submissions
  if (req.method === 'GET') {
    try {
      const params = new URLSearchParams({
        filterByFormula: `{Submission Status}="Pending"`,
        pageSize: '100',
      });
      const data = await airtableRequest(`?${params}`);
      const records = (data.records || []).sort((a, b) => b.id.localeCompare(a.id));
      return res.status(200).json(records);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PATCH — approve or reject
  if (req.method === 'PATCH') {
    try {
      const { id, action } = req.body; // action: 'approve' | 'reject'
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
