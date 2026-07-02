// Read-only lookup for the creator editor: the resource's current editable
// field values plus its live scores and the AI judge's rationale, so an owner
// can see exactly why their score is what it is. This mirrors what's already
// public on the resource page (Name/URL/Description/Image/scores) plus Score
// Rationale (not shown publicly elsewhere, but not sensitive — it's the
// evidence behind a score for a public listing).

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${id}`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!r.ok) return res.status(r.status === 404 ? 404 : 500).json({ error: 'Resource not found' });
  const record = await r.json();
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
