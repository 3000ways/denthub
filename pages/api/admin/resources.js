import { isAdminAuthenticated } from '../../../lib/admin-auth';
import {
  adminListResources, adminCreateResource, adminUpdateResource, adminDeleteResource,
} from '../../../lib/resources-db-admin';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list all resources (name order, like the old Airtable sort)
  if (req.method === 'GET') {
    try {
      const records = await adminListResources();
      records.sort((a, b) => (a.fields.Name || '').localeCompare(b.fields.Name || ''));
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
      const record = await adminCreateResource(fields);
      return res.status(200).json(record);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // PATCH — update a resource
  if (req.method === 'PATCH') {
    try {
      const { id, fields } = req.body;
      const record = await adminUpdateResource(id, fields);
      return res.status(200).json(record);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — delete a resource
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await adminDeleteResource(id);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
