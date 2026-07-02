// Read-only status for the admin Episode Tagging tab: coverage (how many of
// the archive's episodes are tagged), the last run, and a live sample of
// recent taggings — so the admin can see what the AI is actually doing
// without touching the database directly.

import { getTaggingStatus } from '../../../lib/episode-tagger';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const status = await getTaggingStatus();
    return res.status(200).json(status);
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
