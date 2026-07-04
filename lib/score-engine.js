// ─────────────────────────────────────────────────────────────────────────────
// Automated scoring engine — orchestration.
//
// Gathers REAL signals and writes the data-grounded sub-scores back to Airtable.
// Final Score is an Airtable formula, so we only write the sub-scores.
//
// Data-grounded scores (this engine):
//   • Recency     — Podcast: episode archive · YouTube: recent uploads ·
//                   Book: publication year.
//   • Popularity  — YouTube: subscriber count · Podcast: back-catalog size
//                   (reach proxy) · Book: ratings count. Percentile-ranked
//                   within type, Bayesian-shrunk by evidence.
//   • Community   — on-site engagement (votes + comments + bookmarks + pins),
//                   percentile within type, shrunk toward neutral.
//
// Robustness: a *measurable* type (Podcast/YouTube/Book) is only written when we
// actually have a signal — otherwise we leave the existing value alone, so a
// flaky YouTube/Books API call can't flatten scores. Genuinely unmeasurable
// types (Coaching/Software/…) get a deterministic neutral 50 for Recency &
// Popularity. Expert & Clinical Depth are judged separately (next pass).
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabaseAdmin } from './supabase-admin';
import { recencyScore, bookRecencyScore, percentile, shrink } from './scoring';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';
const MEASURABLE = ['Podcast', 'YouTube', 'Book'];

function origin() {
  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://thedentalcommute.com';
}

async function fetchResources() {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) throw new Error('AIRTABLE_PAT not set');
  let records = [], offset;
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

// PostgREST caps a single select at ~1000 rows by default, silently truncating.
// Page through with .range() so signal counts don't quietly undercount once a
// table grows past 1000 rows (a near-term milestone for bookmarks/votes).
async function selectAll(db, table, columns) {
  const PAGE = 1000;
  let from = 0;
  let rows = [];
  for (;;) {
    const { data, error } = await db.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function fetchRecencySignals(db) {
  const data = await selectAll(db, 'resource_recency_signals', 'resource_id, days_since_last, items_90d, total_episodes');
  const map = {};
  data.forEach(r => { map[r.resource_id] = r; });
  return map;
}

async function fetchCommunitySignals(db) {
  const counts = {};
  const bump = (rid, key) => {
    if (!rid) return;
    counts[rid] = counts[rid] || { votes: 0, comments: 0, bookmarks: 0, pins: 0 };
    counts[rid][key]++;
  };
  for (const [table, key] of [['votes', 'votes'], ['comments', 'comments'], ['bookmarks', 'bookmarks'], ['pins', 'pins']]) {
    const data = await selectAll(db, table, 'resource_id');
    data.forEach(row => bump(row.resource_id, key));
  }
  return counts;
}

// Tolerant internal fetch of a stats endpoint (youtube-stats / book-stats).
// Returns {} on any failure so the engine still scores everything else.
async function fetchStats(path) {
  try {
    const res = await fetch(`${origin()}${path}`, { signal: AbortSignal.timeout(25000) });
    return res.ok ? await res.json() : {};
  } catch { return {}; }
}

// Recency for a YouTube channel from its recent uploads' raw dates.
function youtubeRecency(yt) {
  const times = (yt?.recentVideos || [])
    .map(v => v.publishedAt).filter(Boolean)
    .map(d => new Date(d).getTime()).filter(t => !isNaN(t));
  if (!times.length) return null;
  const now = Date.now();
  const freshnessDays = Math.floor((now - Math.max(...times)) / 86400000);
  const items90 = times.filter(t => now - t <= 90 * 86400000).length;
  return recencyScore({ freshnessDays, itemsLast90: items90 });
}

// Compute all data-grounded sub-scores. Pure given the gathered signals.
export function computeScores(resources, recencyMap, communityMap, youtubeMap, bookMap) {
  const currentYear = new Date().getFullYear();

  // Popularity signals + per-type distributions (for percentile).
  const popSig = {}, byTypePop = {};
  for (const r of resources) {
    let sig = null;
    if (r.type === 'YouTube') { const s = youtubeMap[r.id]?.subscribersRaw; if (s != null) sig = { sv: s, n: s }; }
    else if (r.type === 'Podcast') { const t = recencyMap[r.id]?.total_episodes; if (t != null) sig = { sv: t, n: t }; }
    else if (r.type === 'Book') { const c = bookMap[r.id]?.ratingsCount; if (c) sig = { sv: c, n: c }; }
    popSig[r.id] = sig;
    if (sig) (byTypePop[r.type] = byTypePop[r.type] || []).push(sig.sv);
  }

  // Community engagement + per-type distributions.
  const engagement = {}, byTypeEng = {};
  for (const r of resources) {
    const c = communityMap[r.id];
    const sum = c ? c.votes + c.comments + c.bookmarks + c.pins : 0;
    engagement[r.id] = sum;
    (byTypeEng[r.type] = byTypeEng[r.type] || []).push(sum);
  }

  return resources.map(r => {
    const out = { id: r.id, name: r.name, type: r.type, fields: {} };
    const nonMeasurable = !MEASURABLE.includes(r.type);

    // ── Recency ──
    let recency = null;
    if (r.type === 'Podcast') { const s = recencyMap[r.id]; if (s?.days_since_last != null) recency = recencyScore({ freshnessDays: s.days_since_last, itemsLast90: s.items_90d }); }
    else if (r.type === 'YouTube') recency = youtubeRecency(youtubeMap[r.id]);
    else if (r.type === 'Book') recency = bookRecencyScore(parseInt(bookMap[r.id]?.year, 10), currentYear);
    else if (nonMeasurable) recency = 50;
    if (recency != null) { out.fields['Recency Score'] = recency; out.recency = recency; }

    // ── Popularity ──
    let popularity = null;
    const sig = popSig[r.id];
    if (sig) popularity = shrink(percentile(sig.sv, byTypePop[r.type]), sig.n, 50, 10);
    else if (nonMeasurable) popularity = 50;
    if (popularity != null) { out.fields['Popularity Score'] = popularity; out.popularity = popularity; }

    // ── Community ──
    const sum = engagement[r.id];
    const community = shrink(percentile(sum, byTypeEng[r.type]), sum, 50, 10);
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

// Main entry. `write:false` computes and returns a preview without writing.
export async function recomputeScores({ write = true } = {}) {
  const db = getSupabaseAdmin();
  const [resources, recencyMap, communityMap, youtubeMap, bookMap] = await Promise.all([
    fetchResources(),
    fetchRecencySignals(getSupabaseAdmin()),
    fetchCommunitySignals(db),
    fetchStats('/api/youtube-stats'),
    fetchStats('/api/book-stats'),
  ]);

  const computed = computeScores(resources, recencyMap, communityMap, youtubeMap, bookMap);
  const toWrite = computed.filter(c => Object.keys(c.fields).length > 0);

  let written = 0;
  if (write) {
    const batch = toWrite.map(c => ({ id: c.id, fields: c.fields }));
    for (let i = 0; i < batch.length; i += 10) {
      await patchRecords(batch.slice(i, i + 10));
      written += Math.min(10, batch.length - i);
    }
  }

  const summary = {
    resources: resources.length,
    recencyScored: computed.filter(c => c.recency != null).length,
    popularityScored: computed.filter(c => c.popularity != null).length,
    communityScored: computed.filter(c => c.community != null).length,
    written: write ? written : 0,
  };

  // Log the run so the admin can see when it last succeeded (write runs only).
  if (write) {
    try { await db.from('scoring_runs').insert({ kind: 'data', summary }); } catch {}
  }

  const sample = computed
    .filter(c => c.recency != null || c.popularity != null)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 10)
    .map(c => ({ name: c.name, type: c.type, recency: c.recency ?? '—', popularity: c.popularity ?? '—', community: c.community ?? '—' }));

  return { status: 'ok', write, ...summary, sample };
}
