// ─────────────────────────────────────────────────────────────────────────────
// Automated scoring engine — orchestration.
//
// Gathers REAL signals and writes the data-grounded sub-scores back to Airtable.
// Final Score is an Airtable formula, so we only ever write the sub-scores.
//
// This pass covers the two scores that are fully data-grounded today:
//   • Recency   — from the episode archive (podcasts), per lib/scoring.recencyScore
//   • Community — from on-site engagement (votes + comments + bookmarks + pins),
//                 percentile-ranked within the resource's type, then Bayesian-
//                 shrunk toward neutral so low-traffic resources sit near 50.
//
// Popularity and the LLM-judged Expert / Clinical Depth land in later passes.
// We only write the fields we compute — existing values for the others are left
// untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabaseAdmin } from './supabase-admin';
import { recencyScore, percentile, shrink } from './scoring';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

// Pull every resource we might score (Name, Type). Paginated.
async function fetchResources() {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT not set');
  let records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.append('fields[]', 'Name');
    params.append('fields[]', 'Type');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records.map(r => ({ id: r.id, name: r.fields.Name || '', type: r.fields.Type || 'Other' }));
}

// Recency signals per show (one row per podcast) from the Supabase view.
async function fetchRecencySignals(db) {
  const { data, error } = await db.from('resource_recency_signals').select('resource_id, days_since_last, items_90d');
  if (error) throw new Error(`recency signals: ${error.message}`);
  const map = {};
  (data || []).forEach(r => { map[r.resource_id] = r; });
  return map;
}

// On-site engagement counts per resource_id (small tables — aggregate in JS).
async function fetchCommunitySignals(db) {
  const counts = {}; // resource_id -> { votes, comments, bookmarks, pins }
  const bump = (rid, key) => {
    if (!rid) return;
    counts[rid] = counts[rid] || { votes: 0, comments: 0, bookmarks: 0, pins: 0 };
    counts[rid][key]++;
  };
  for (const [table, key] of [['votes', 'votes'], ['comments', 'comments'], ['bookmarks', 'bookmarks'], ['pins', 'pins']]) {
    const { data, error } = await db.from(table).select('resource_id');
    if (error) throw new Error(`${table}: ${error.message}`);
    (data || []).forEach(row => bump(row.resource_id, key));
  }
  return counts;
}

// Compute the new sub-scores for every resource. Pure given the gathered signals.
export function computeScores(resources, recencyMap, communityMap) {
  // Engagement sum per resource, and the per-type distribution for percentile.
  const engagement = {};                    // id -> sum
  const byTypeSums = {};                     // type -> [sums]
  for (const r of resources) {
    const c = communityMap[r.id];
    const sum = c ? c.votes + c.comments + c.bookmarks + c.pins : 0;
    engagement[r.id] = sum;
    (byTypeSums[r.type] = byTypeSums[r.type] || []).push(sum);
  }

  return resources.map(r => {
    const out = { id: r.id, name: r.name, type: r.type, fields: {} };

    // Recency (podcasts with archive data).
    const sig = recencyMap[r.id];
    if (sig && sig.days_since_last != null) {
      const rec = recencyScore({ freshnessDays: sig.days_since_last, itemsLast90: sig.items_90d });
      if (rec != null) { out.fields['Recency Score'] = rec; out.recency = rec; }
    }

    // Community: percentile of engagement within type, shrunk by evidence count.
    const sum = engagement[r.id];
    const observed = percentile(sum, byTypeSums[r.type]);
    const community = shrink(observed, sum, 50, 10);   // n = engagement events
    if (community != null) { out.fields['Community Score'] = community; out.community = community; }

    return out;
  });
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

// Main entry. `write:false` computes and returns a preview without touching
// Airtable. Returns a summary + a small sample for eyeballing.
export async function recomputeScores({ write = true } = {}) {
  const db = getSupabaseAdmin();
  const [resources, recencyMap, communityMap] = await Promise.all([
    fetchResources(),
    fetchRecencySignals(getSupabaseAdmin()),
    fetchCommunitySignals(db),
  ]);

  const computed = computeScores(resources, recencyMap, communityMap);
  const toWrite = computed.filter(c => Object.keys(c.fields).length > 0);

  let written = 0;
  if (write) {
    const batch = toWrite.map(c => ({ id: c.id, fields: c.fields }));
    for (let i = 0; i < batch.length; i += 10) {
      await patchRecords(batch.slice(i, i + 10));
      written += Math.min(10, batch.length - i);
    }
  }

  const recencyCount = computed.filter(c => c.recency != null).length;
  const sample = computed
    .filter(c => c.recency != null)
    .sort((a, b) => (b.recency || 0) - (a.recency || 0))
    .slice(0, 8)
    .map(c => ({ name: c.name, type: c.type, recency: c.recency, community: c.community }));

  return {
    status: 'ok',
    write,
    resources: resources.length,
    recencyScored: recencyCount,
    communityScored: computed.filter(c => c.community != null).length,
    written: write ? written : 0,
    sample,
  };
}
