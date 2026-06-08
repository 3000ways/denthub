// ONE-TIME SETUP — call this once after deploy to patch the Tags field with the
// full 25-tag taxonomy. Safe to call multiple times (idempotent).
// DELETE this file after running.

const BASE  = 'appICV69R7tzizCDY';
const TABLE = 'tblBlou0rXbImoQ75';
const FIELD = 'fldX4YG03yjcOWTCw'; // Tags field

const FINAL_CHOICES = [
  // Topic
  'Clinical', 'Business', 'Finance', 'Technology', 'Marketing', 'Career', 'Wellbeing',
  // Audience
  'Dentists', 'Students', 'Hygienists', 'Dental Teams',
  // Specialty
  'Endodontics', 'Orthodontics', 'Periodontics', 'Pediatric Dentistry',
  'Oral & Maxillofacial Surgery', 'Prosthodontics', 'Implants', 'Cosmetic Dentistry',
  'Oral & Maxillofacial Pathology', 'Oral & Maxillofacial Radiology',
  'Dental Public Health', 'Dental Anesthesiology', 'Oral Medicine', 'Orofacial Pain',
];

export default async function handler(req, res) {
  const PAT = process.env.AIRTABLE_PAT;
  if (!PAT) return res.status(500).json({ error: 'AIRTABLE_PAT not set' });

  // 1. Get existing choices so we can preserve their IDs (required by Airtable)
  const schemaRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables`,
    { headers: { Authorization: `Bearer ${PAT}` } }
  );
  const schema = await schemaRes.json();
  const table  = schema.tables.find(t => t.id === TABLE);
  const field  = table?.fields.find(f => f.id === FIELD);
  const existing = field?.options?.choices || [];

  // Build merged choices: keep existing IDs where name matches, add new ones
  const existingMap = {};
  existing.forEach(c => { existingMap[c.name] = c.id; });

  const choices = FINAL_CHOICES.map(name => {
    // Also map old names to new ones so we reuse their IDs
    const oldNameMap = { 'Students': 'Student', 'Hygienists': 'Hygiene', 'Oral & Maxillofacial Surgery': 'Oral Surgery' };
    const lookupName = oldNameMap[name] || name;
    const id = existingMap[name] || existingMap[lookupName];
    return id ? { id, name } : { name };
  });

  // 2. Patch the field
  const patchRes = await fetch(
    `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${TABLE}/fields/${FIELD}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { choices } }),
    }
  );
  const result = await patchRes.json();

  if (!patchRes.ok) return res.status(500).json({ error: result });
  return res.status(200).json({ ok: true, choices: result.options?.choices?.map(c => c.name) });
}
