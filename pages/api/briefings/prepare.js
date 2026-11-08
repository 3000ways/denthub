// Journal Briefings — prepare one drafted weekly briefing for rendering (the
// hybrid format). Called by the Monday render job, repeatedly, until it says
// `done`; each call does as much as fits in its time budget. Idempotent.
//
// For every paper the briefing covers in depth:
//   1. make sure its open-access status is known (Unpaywall; the nightly
//      harvest only checks ~40 a night, so most papers arrive here unchecked),
//   2. derive the read mode from the licence (lib/briefing-script readModeFor),
//   3. if it is all-rights-reserved, write the own-words summary and run the
//      copy/number checks (lib/briefing-summary); a failed summary makes the
//      paper quote_only — it is never spoken.
// When every paper is settled, the script is rebuilt with the modes and the
// briefing's checks record what was done (modes, LLM cost, estimate).
// Guard: CRON_SECRET or admin cookie.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { lookupOpenAccess } from '../../../lib/unpaywall';
import { readModeFor, buildWeeklyScript, estimateSeconds } from '../../../lib/briefing-script';
import { summarizeArticle } from '../../../lib/briefing-summary';
import { findCluster } from '../../../lib/journals';
import { authorized } from './draft';

export const config = { maxDuration: 60 };
const BUDGET_MS = 38000;   // stop starting papers after this; the job calls again

const needsWork = a => !a.read_mode || (a.read_mode === 'hybrid' && !a.summary);

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const id = Number((req.body || {}).briefing_id);
  if (!id) return res.status(400).json({ error: 'briefing_id required' });
  const started = Date.now();
  const db = getSupabaseAdmin();
  try {
    const { data: b, error } = await db.from('briefings').select('id, cluster, kind, week_of, status, script, article_ids, headline_ids, checks').eq('id', id).single();
    if (error || !b) return res.status(404).json({ error: 'briefing not found' });
    if (b.kind !== 'weekly') return res.status(200).json({ done: true, remaining: 0, processed: 0, script: b.script, checks: b.checks });

    const ids = [...(b.article_ids || []), ...(b.headline_ids || [])];
    const { data: rows, error: aErr } = await db.from('articles')
      .select('id, pmid, doi, title, authors, abstract, journal_abbr, journal_name, url, oa_status, oa_license, oa_host_type, oa_checked_at, read_mode, summary, summary_meta')
      .in('id', ids.length ? ids : [-1]);
    if (aErr) throw new Error(aErr.message);
    const byId = Object.fromEntries((rows || []).map(a => [a.id, a]));
    const fullReads = (b.article_ids || []).map(i => byId[i]).filter(Boolean);
    const headlines = (b.headline_ids || []).map(i => byId[i]).filter(Boolean);

    let processed = 0;
    for (const a of fullReads) {
      if (!needsWork(a)) continue;
      if (processed && Date.now() - started > BUDGET_MS) break;
      const patch = { updated_at: new Date().toISOString() };
      // 1. licence (also re-check papers checked before migration 0028, which stored no host type)
      if (a.doi && (!a.oa_checked_at || (a.oa_license && !a.oa_host_type))) {
        const oa = await lookupOpenAccess(a.doi);
        if (oa.checked) {
          Object.assign(patch, { oa_status: oa.oa_status, oa_url: oa.oa_url, oa_license: oa.license, oa_host_type: oa.host_type, oa_checked_at: new Date().toISOString() });
          Object.assign(a, { oa_status: oa.oa_status, oa_license: oa.license, oa_host_type: oa.host_type });
        }
      }
      // 2. mode
      const mode = readModeFor(a);
      patch.read_mode = mode; a.read_mode = mode;
      // 3. summary for all-rights-reserved papers
      if (mode === 'hybrid' && !a.summary) {
        const r = await summarizeArticle(a);
        if (r.ok) { patch.summary = r.summary; a.summary = r.summary; }
        else { patch.read_mode = 'quote_only'; a.read_mode = 'quote_only'; }
        patch.summary_meta = r.meta; a.summary_meta = r.meta;
        patch.summary_at = new Date().toISOString();
      }
      const { error: uErr } = await db.from('articles').update(patch).eq('id', a.id);
      if (uErr) throw new Error(`article ${a.id}: ${uErr.message}`);
      processed++;
    }

    const remaining = fullReads.filter(needsWork).length;
    if (remaining > 0) return res.status(200).json({ done: false, remaining, processed });

    // Everything settled: rebuild the script with modes and summaries.
    const c = findCluster(b.cluster);
    const { data: js } = await db.from('journals').select('pubmed_abbr, spoken_name').eq('cluster', b.cluster);
    const spoken = Object.fromEntries((js || []).map(j => [j.pubmed_abbr, j.spoken_name]));
    const script = buildWeeklyScript({ show: c ? c.show : b.cluster, label: c ? c.label.toLowerCase() : b.cluster, weekOf: b.week_of, fullReads, headlines, spokenName: abbr => spoken[abbr] });
    const modes = {};
    for (const a of fullReads) modes[a.read_mode || 'hybrid'] = (modes[a.read_mode || 'hybrid'] || 0) + 1;
    const llm_cents = fullReads.reduce((n, a) => n + Number((a.summary_meta && a.summary_meta.cents) || 0), 0);
    const checks = { ...(b.checks || {}), prepared: true, prepared_at: new Date().toISOString(), modes, llm_cents: Number(llm_cents.toFixed(4)), estimated_seconds: estimateSeconds(script), papers: fullReads.length + headlines.length,
      quote_only: fullReads.filter(a => a.read_mode === 'quote_only').map(a => ({ id: a.id, why: (a.summary_meta && (a.summary_meta.error || (a.summary_meta.attempts || []).map(x => (x.problems || []).join('; ')).join(' | '))) || 'summary failed' })) };
    const { error: bErr } = await db.from('briefings').update({ script, checks, updated_at: new Date().toISOString() }).eq('id', id);
    if (bErr) throw new Error(bErr.message);
    return res.status(200).json({ done: true, remaining: 0, processed, script, checks });
  } catch (err) {
    console.error('[briefings/prepare] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
