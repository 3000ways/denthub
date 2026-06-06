export default async function handler(req, res) {
  const { table } = req.query;
  const PAT = process.env.AIRTABLE_PAT;
  const BASE = process.env.AIRTABLE_BASE_ID || 'appICV69R7tzizCDY';

  if (!PAT) {
    return res.status(500).json({ error: 'AIRTABLE_PAT environment variable not set' });
  }

  const allowed = ['Resources', 'Categories', 'Votes'];
  if (!allowed.includes(table)) {
    return res.status(400).json({ error: 'Invalid table' });
  }

  const params = new URLSearchParams();
  if (table === 'Resources') {
    params.set('filterByFormula', "FIND('Published',{Status})");
    params.set('sort[0][field]', 'Final Score');
    params.set('sort[0][direction]', 'desc');
  }
  if (table === 'Categories') {
    params.set('filterByFormula', '{Visible}=1');
    params.set('sort[0][field]', 'Display Order');
    params.set('sort[0][direction]', 'asc');
  }

  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${BASE}/${table}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${PAT}` } }
    );
    const data = await airtableRes.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
