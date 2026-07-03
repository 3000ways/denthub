// Read-only status for the admin "Run Research" tab. Answers three questions:
//   1. Did it run, and when / how much did it find?  (from research_runs)
//   2. How many resources are waiting on my review?   (from Airtable)
//   3. Where should I research next?                   (coverage per subcategory)
//
// Coverage counts resources by Type × Specialty — the dimensions the homepage
// actually filters on — matching each subcategory in the research plan. The
// per-subcategory "last researched" date comes from the research_runs log.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { allSubcategories, RESEARCH_GROUPS } from '../../../lib/research-plan';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

const STALE_DAYS = 45;
const THIN_LIVE = 5;

async function fetchResourcesForCounts() {
  let records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    ['Type', 'Specialty', 'Status', 'Submission Status'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch error ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records.map(r => r.fields);
}

function specialtyList(f) {
  const s = f.Specialty;
  return Array.isArray(s) ? s : s ? [s] : [];
}

function flagFor(live, lastResearched) {
  if (!lastResearched) return 'never';
  if (live < THIN_LIVE) return 'thin';
  const ageDays = (Date.now() - new Date(lastResearched).getTime()) / 86400000;
  if (ageDays > STALE_DAYS) return 'stale';
  return 'good';
}

// never first, then thin, then stale, then good; within a flag, emptiest first.
const FLAG_ORDER = { never: 0, thin: 1, stale: 2, good: 3 };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const db = getSupabaseAdmin();
    const [resourceFields, lastRunRes, recentRes, perSubRes] = await Promise.all([
      fetchResourcesForCounts(),
      db.from('research_runs').select('ran_at, research_group, batch_id').order('ran_at', { ascending: false }).limit(1),
      db.from('research_runs').select('batch_id, added, duplicates, dead_links, directories, research_group, ran_at').order('ran_at', { ascending: false }).limit(200),
      db.from('research_runs').select('subcategory, ran_at').order('ran_at', { ascending: false }).limit(1000),
    ]);

    // Live + pending counts per (type, specialty)
    const live = {};    // key `${type}|${specialty}` → count of Published
    const pending = {};  // same key → count of Pending
    let pendingTotal = 0;
    for (const f of resourceFields) {
      const type = f.Type || '';
      const isPublished = f.Status === 'Published';
      const isPending = f['Submission Status'] === 'Pending';
      if (isPending) pendingTotal++;
      for (const sp of specialtyList(f)) {
        const key = `${type}|${sp}`;
        if (isPublished) live[key] = (live[key] || 0) + 1;
        if (isPending) pending[key] = (pending[key] || 0) + 1;
      }
    }

    // Most-recent research date per subcategory label
    const lastBySub = {};
    for (const row of perSubRes.data || []) {
      if (!lastBySub[row.subcategory]) lastBySub[row.subcategory] = row.ran_at;
    }

    // Last completed "run": the most-recent batch, summed
    const lastRun = (lastRunRes.data && lastRunRes.data[0]) || null;
    let lastBatch = null;
    if (lastRun?.batch_id) {
      const rows = (recentRes.data || []).filter(r => r.batch_id === lastRun.batch_id);
      lastBatch = rows.reduce((acc, r) => ({
        group: r.research_group,
        ran_at: acc.ran_at || r.ran_at,
        added: acc.added + (r.added || 0),
        duplicates: acc.duplicates + (r.duplicates || 0),
        dead_links: acc.dead_links + (r.dead_links || 0),
        subcategories: acc.subcategories + 1,
      }), { group: lastRun.research_group, ran_at: null, added: 0, duplicates: 0, dead_links: 0, subcategories: 0 });
    }

    const coverage = allSubcategories().map(sub => {
      const key = `${sub.type}|${sub.specialty}`;
      const liveCount = live[key] || 0;
      const pendingCount = pending[key] || 0;
      const lastResearched = lastBySub[sub.label] || null;
      return {
        group: sub.group,
        label: sub.label,
        type: sub.type,
        specialty: sub.specialty,
        live: liveCount,
        pending: pendingCount,
        lastResearched,
        flag: flagFor(liveCount, lastResearched),
      };
    }).sort((a, b) =>
      (FLAG_ORDER[a.flag] - FLAG_ORDER[b.flag]) || (a.live - b.live) || a.label.localeCompare(b.label)
    );

    return res.status(200).json({
      groups: RESEARCH_GROUPS,
      lastRun,
      lastBatch,
      pendingTotal,
      coverage,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
