// AI-assisted tagging pass (Phase 2 of the tagging foundation).
//
// Reads resources that don't yet have Goals / Outcomes, asks Perplexity to
// classify each one — using ONLY the fixed vocabularies below — and writes the
// suggestions back with "Needs Tag Review" = true so nothing is treated as final
// until Andrei reviews/corrects it in Airtable.
//
// Designed to be run in small batches (call repeatedly from the admin "Auto-Tag"
// tab); it's idempotent because it only ever picks up still-untagged resources.

import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

// Must match the Airtable choice names EXACTLY (see Goals / Outcomes + Career Stage fields).
const GOALS = [
  'Introduce Implants', 'Start Clear Aligners/Ortho', 'Offer Sedation/Sleep',
  'Master Molar Endo', 'Full-Arch / Same-Day Digital', 'Manage Complications',
  'Scale Before Selling', 'Increase Profitability (EBITDA)', 'Improve Case Acceptance',
  'Get More New Patients', 'Open/Acquire a 2nd Location', 'Find a Great Associate',
  'Hire & Keep a Team', 'Become a Better Leader', 'Land Your First Job & Contract',
  'Plan Your Exit / Sell', 'Build Wealth / Tackle Debt', 'Beat Burnout & Find Balance',
];
const CAREER_STAGES = ['Student', 'New Grad', 'Associate', 'Practice Owner', 'Thinking of Selling'];

const GOALS_FIELD = 'Goals / Outcomes';
const CAREER_FIELD = 'Career Stage';
const REVIEW_FIELD = 'Needs Tag Review';

// Only ever touch published resources that still have no goals assigned.
const UNTAGGED_FORMULA = `AND({Status}='Published', {${GOALS_FIELD}}='')`;

async function airtableRequest(path, options = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) throw new Error(`Airtable error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Count how many published resources are still untagged (for progress display).
async function countUntagged() {
  let total = 0;
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100', filterByFormula: UNTAGGED_FORMULA });
    params.append('fields[]', 'Name'); // minimal payload — we only need the count
    if (offset) params.set('offset', offset);
    const data = await airtableRequest(`?${params}`);
    total += data.records.length;
    offset = data.offset;
  } while (offset);
  return total;
}

// Ask Perplexity to classify a batch of resources in one call.
async function classifyBatch(items) {
  const list = items.map((it, i) =>
    `${i + 1}. Name: ${it.name}\n   Type: ${it.type || 'Unknown'}\n   Host/Author: ${it.host || 'Unknown'}\n   Description: ${it.description || '(none)'}`
  ).join('\n\n');

  const prompt = `You are tagging dental learning resources so dentists can find them by what they want to achieve. Classify ONLY from the text given below — do NOT search the web.

For each numbered resource, choose:
- "goals": the outcomes this resource genuinely helps a dentist achieve. Use ONLY these exact strings: ${JSON.stringify(GOALS)}. Pick 0 to 4. Be conservative — only include a goal if the resource clearly helps with it. Use [] if none fit.
- "careerStages": who it's most useful for. Use ONLY these exact strings: ${JSON.stringify(CAREER_STAGES)}. Pick 0 to 3, or [] if it applies broadly to everyone.

Resources:
${list}

Return ONLY a valid JSON array, one object per resource in the same order, each like {"n": 1, "goals": [...], "careerStages": [...]}. No markdown, no prose.`;

  const aiRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You are a precise classifier. Respond with ONLY a raw JSON array — no markdown, no code fences, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
  });
  if (!aiRes.ok) throw new Error(`Perplexity error: ${await aiRes.text()}`);
  const raw = (await aiRes.json()).choices?.[0]?.message?.content?.trim() || '';
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/\[\d+\]/g, '') // strip Perplexity citation markers like [1]
    .trim();

  let parsed = [];
  try { parsed = JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) { try { parsed = JSON.parse(m[0]); } catch {} } }
  return Array.isArray(parsed) ? parsed : [];
}

// Keep only values that exist in the fixed vocabulary (drop any hallucinated tags).
const keepValid = (arr, vocab) =>
  Array.isArray(arr) ? [...new Set(arr.filter(v => vocab.includes(v)))] : [];

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Progress check only.
    try {
      return res.status(200).json({ remaining: await countUntagged() });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json({ status: 'no_ai_key', message: 'Add PERPLEXITY_API_KEY in Vercel to enable auto-tagging.', processed: 0, results: [] });
  }

  const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 12, 1), 25);

  try {
    // 1. Pull the next batch of untagged resources.
    const params = new URLSearchParams({ pageSize: String(limit), filterByFormula: UNTAGGED_FORMULA });
    ['Name', 'Type', 'Host or Author', 'Description'].forEach(f => params.append('fields[]', f));
    const batch = await airtableRequest(`?${params}`);
    const items = batch.records.map(r => ({
      id: r.id,
      name: r.fields.Name || '',
      type: r.fields.Type || '',
      host: r.fields['Host or Author'] || '',
      description: r.fields.Description || '',
    }));

    if (items.length === 0) {
      return res.status(200).json({ processed: 0, remaining: 0, results: [], done: true });
    }

    // 2. Classify the whole batch in one AI call.
    const classified = await classifyBatch(items);
    const byIndex = new Map(classified.map(c => [Number(c.n), c]));

    // 3. Build the Airtable updates (validated against the fixed vocab).
    const updates = items.map((it, i) => {
      const c = byIndex.get(i + 1) || {};
      const goals = keepValid(c.goals, GOALS);
      const careerStages = keepValid(c.careerStages, CAREER_STAGES);
      return {
        id: it.id,
        name: it.name,
        fields: {
          [GOALS_FIELD]: goals,
          [CAREER_FIELD]: careerStages,
          [REVIEW_FIELD]: true,
        },
        goals,
        careerStages,
      };
    });

    // 4. Write back in chunks of 10 (Airtable's per-request limit). typecast off so
    //    only real, pre-defined choices are written.
    for (let i = 0; i < updates.length; i += 10) {
      const chunk = updates.slice(i, i + 10).map(u => ({ id: u.id, fields: u.fields }));
      await airtableRequest('', {
        method: 'PATCH',
        body: JSON.stringify({ records: chunk, typecast: false }),
      });
    }

    const remaining = await countUntagged();
    return res.status(200).json({
      processed: updates.length,
      remaining,
      done: remaining === 0,
      results: updates.map(u => ({ name: u.name, goals: u.goals, careerStages: u.careerStages })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
