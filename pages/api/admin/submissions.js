import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { adminListResources, adminUpdateResource, adminUpdateResources } from '../../../lib/resources-db-admin';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET — list all pending submissions (paginate through all pages)
  if (req.method === 'GET') {
    try {
      const allRecords = await adminListResources({ submissionStatus: 'Pending' });
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
        const pending = await adminListResources({ submissionStatus: 'Pending', select: 'id' });
        const fields = { 'Submission Status': 'Approved', Status: 'Published' };
        await adminUpdateResources(pending.map(r => ({ id: r.id, fields })));
        return res.status(200).json({ approved: pending.length });
      }

      // Single record
      const fields = {
        'Submission Status': action === 'approve' ? 'Approved' : 'Rejected',
        ...(action === 'approve' ? { Status: 'Published' } : {}),
      };
      const record = await adminUpdateResource(id, fields);
      return res.status(200).json(record);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
