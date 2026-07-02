// ─────────────────────────────────────────────────────────────────────────────
// Automated scoring — the AI judge (Expert + Clinical Depth).
//
// These two scores are judgments, not stats, so an LLM is appropriate — but it
// must reason over REAL evidence and cite it, never fabricate a number. For each
// resource we feed its actual recent content (podcast episode titles, YouTube
// video titles) + host/description, and ask Perplexity (which also web-searches
// for host credentials) to score against a fixed rubric and return a cited
// rationale. The rationale is saved to Airtable's "Score Rationale" field so
// every judged score is auditable.
//
// Rotating + rate-limited: each run judges the least-recently-judged handful
// (tracked by the "Last Judged" field) so it churns the catalogue over time and
// keeps LLM cost bounded per run.
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabaseAdmin } from './supabase-admin';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

function origin() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://thedentalcommute.com';
}

async function fetchPublished() {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT not set');
  let records = [], offset;
  do {
    const params = new URLSearchParams({ pageSize: '100', filterByFormula: `{Status}='Published'` });
    ['Name', 'Type', 'Host or Author', 'URL', 'Description', 'Last Judged'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records.map(r => ({
    id: r.id,
    name: r.fields.Name || '',
    type: r.fields.Type || 'Other',
    host: r.fields['Host or Author'] || '',
    url: r.fields.URL || '',
    description: r.fields.Description || '',
    lastJudged: r.fields['Last Judged'] || null,
  }));
}

// Recent episode titles per show, for the batch's podcasts (one query).
async function podcastEvidence(db, podcastIds) {
  if (!podcastIds.length) return {};
  const { data } = await db.from('episodes')
    .select('show_resource_id, title, published_at')
    .in('show_resource_id', podcastIds)
    .order('published_at', { ascending: false })
    .limit(podcastIds.length * 8);
  const map = {};
  (data || []).forEach(e => {
    map[e.show_resource_id] = map[e.show_resource_id] || [];
    if (map[e.show_resource_id].length < 6 && e.title) map[e.show_resource_id].push(e.title);
  });
  return map;
}

// Recent video titles per channel, from the cached youtube-stats endpoint.
async function youtubeEvidence() {
  try {
    const res = await fetch(`${origin()}/api/youtube-stats`, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    Object.entries(data).forEach(([id, v]) => {
      map[id] = (v.recentVideos || []).map(x => x.title).filter(Boolean).slice(0, 6);
    });
    return map;
  } catch { return {}; }
}

async function judgeOne(r, evidence) {
  const prompt = `Evaluate this dental resource on two dimensions (0-100 each).

Resource: ${r.name} (${r.type})
Host/Author: ${r.host || 'unknown'}
URL: ${r.url}
Description: ${r.description || '(none provided)'}
${evidence.length ? `Recent content:\n- ${evidence.join('\n- ')}` : '(no recent content list available)'}

Dimensions:
- ExpertScore: authority and reputation among dental professionals — host/author credentials (board-certified specialist, academic/faculty, recognized key opinion leader), calibre of guests, peer standing.
- ClinicalDepthScore: depth and clinical rigor for practicing dentists — evidence-based, clinically actionable detail. Score low for surface-level, marketing, or purely business/lifestyle content.

Use the recent content above plus your web knowledge of this resource and its host. Be skeptical and calibrated: most resources are average (40-70). Reserve 85+ for clearly exceptional, widely-recognized authorities; use below 40 for thin or off-topic content.

Return ONLY a JSON object, no markdown:
{"expert": <int 0-100>, "clinical": <int 0-100>, "rationale": "<1-2 sentences citing the specific evidence you used>"}`;

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You are a rigorous dental-education evaluator. Respond with ONLY a valid JSON object — no markdown, no prose.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').trim();
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').replace(/\[\d+\]/g, '').trim();
  let obj;
  try { obj = JSON.parse(cleaned); } catch { const m = cleaned.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : null; }
  if (!obj) return null;
  const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n))));
  const expert = obj.expert != null ? clamp(obj.expert) : NaN;
  const clinical = obj.clinical != null ? clamp(obj.clinical) : NaN;
  if (isNaN(expert) || isNaN(clinical)) return null;
  return { expert, clinical, rationale: (obj.rationale || '').toString().slice(0, 500) };
}

async function patchRecords(records) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Airtable PATCH ${res.status}: ${await res.text()}`);
  return res.json();
}

// Judge the least-recently-judged `limit` resources. Writes Expert Score,
// Clinical Depth Score, Score Rationale, and stamps Last Judged.
export async function judgeBatch({ limit = 10 } = {}) {
  if (!process.env.PERPLEXITY_API_KEY) return { status: 'no_ai_key', judged: 0 };
  const db = getSupabaseAdmin();

  const all = await fetchPublished();
  // Rotation: never-judged first, then oldest Last Judged.
  all.sort((a, b) => {
    if (!a.lastJudged && !b.lastJudged) return 0;
    if (!a.lastJudged) return -1;
    if (!b.lastJudged) return 1;
    return new Date(a.lastJudged) - new Date(b.lastJudged);
  });
  const neverJudged = all.filter(r => !r.lastJudged).length;
  const batch = all.slice(0, limit);
  if (!batch.length) return { status: 'ok', judged: 0, totalPublished: 0 };

  const podcastIds = batch.filter(r => r.type === 'Podcast').map(r => r.id);
  const [podEv, ytEv] = await Promise.all([podcastEvidence(db, podcastIds), youtubeEvidence()]);

  const results = await Promise.allSettled(batch.map(r => {
    const ev = r.type === 'Podcast' ? (podEv[r.id] || []) : r.type === 'YouTube' ? (ytEv[r.id] || []) : [];
    return judgeOne(r, ev).then(j => ({ r, j }));
  }));

  const nowIso = new Date().toISOString();
  const toWrite = [], sample = [];
  for (const res of results) {
    if (res.status !== 'fulfilled' || !res.value.j) continue;
    const { r, j } = res.value;
    toWrite.push({ id: r.id, fields: {
      'Expert Score': j.expert,
      'Clinical Depth Score': j.clinical,
      'Score Rationale': j.rationale,
      'Last Judged': nowIso,
    } });
    sample.push({ name: r.name, type: r.type, expert: j.expert, clinical: j.clinical, rationale: j.rationale });
  }

  for (let i = 0; i < toWrite.length; i += 10) await patchRecords(toWrite.slice(i, i + 10));

  const summary = {
    judged: toWrite.length,
    attempted: batch.length,
    totalPublished: all.length,
    neverJudgedRemaining: Math.max(0, neverJudged - toWrite.length),
  };
  try { await db.from('scoring_runs').insert({ kind: 'judge', summary }); } catch {}

  return { status: 'ok', ...summary, sample };
}
