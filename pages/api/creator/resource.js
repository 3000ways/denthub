// Read-only lookup for the creator editor: the resource's current editable
// field values plus its live scores and the AI judge's rationale, so an owner
// can see exactly why their score is what it is. This mirrors what's already
// public on the resource page (Name/URL/Description/Image/scores) plus Score
// Rationale (not shown publicly elsewhere, but not sensitive — it's the
// evidence behind a score for a public listing).

import { adminGetResource } from '../../../lib/resources-db-admin';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  let record;
  try {
    record = await adminGetResource(id);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  if (!record) return res.status(404).json({ error: 'Resource not found' });
  const f = record.fields || {};

  return res.status(200).json({
    id: record.id,
    Name: f.Name || '',
    Type: f.Type || '',
    URL: f.URL || '',
    Description: f.Description || '',
    'Image URL': f['Image URL'] || '',
    'Host or Author': f['Host or Author'] || '',
    'RSS Feed URL': f['RSS Feed URL'] || '',
    scores: {
      expert: f['Expert Score'] ?? null,
      community: f['Community Score'] ?? null,
      popularity: f['Popularity Score'] ?? null,
      recency: f['Recency Score'] ?? null,
      clinicalDepth: f['Clinical Depth Score'] ?? null,
      final: f['Final Score'] ?? null,
    },
    scoreRationale: f['Score Rationale'] || '',
    lastJudged: f['Last Judged'] || null,
  });
}
