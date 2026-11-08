// Journal Briefings — drafting: turn the week's harvested papers into briefing
// rows with a script, ready for the render job. Server-only (service role).
//
// For each cluster that has active journals and no briefing for the week:
//   1. take the papers received in the 7 days before the Monday (plus the
//      Monday itself) that belong to the cluster and are not yet routed,
//   2. order them: study tier, then journal priority (society journal first)
//      round-robin inside a tier for variety, then newest first,
//   3. the first FULL_READS are read in full, the rest get a 30-second slot,
//   4. build the script (lib/briefing-script.js) and insert the briefing,
//      marking the papers `scheduled` and routing them to this cluster.
// A cluster with nothing new gets a `skipped` row (so the admin shows why
// there was no episode) and no audio is rendered.
// A cluster with no trailer yet gets a trailer draft first.

import { getSupabaseAdmin } from './supabase-admin';
import { CLUSTERS } from './journals';
import { buildWeeklyScript, buildTrailerScript, FULL_READS, estimateSeconds, cleanTitle } from './briefing-script';

// Monday (UTC date) for "this week": the coming Monday when run on a Sunday,
// otherwise the most recent Monday (today if today is Monday).
export function weekOfFor(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();                 // 0 Sun … 6 Sat
  const shift = dow === 0 ? 1 : -((dow + 6) % 7);
  d.setUTCDate(d.getUTCDate() + shift);
  return d.toISOString().slice(0, 10);
}

function orderArticles(rows, journalOrder) {
  const prio = abbr => { const i = journalOrder.indexOf(abbr); return i < 0 ? 99 : i; };
  const byTier = {};
  for (const r of rows) (byTier[r.rank_tier] = byTier[r.rank_tier] || []).push(r);
  const out = [];
  for (const tier of Object.keys(byTier).map(Number).sort((a, b) => a - b)) {
    // round-robin across journals (in priority order), newest first within a journal
    const groups = {};
    for (const r of byTier[tier]) (groups[r.journal_abbr] = groups[r.journal_abbr] || []).push(r);
    for (const g of Object.values(groups)) g.sort((a, b) => String(b.received_at || '').localeCompare(String(a.received_at || '')));
    const keys = Object.keys(groups).sort((a, b) => prio(a) - prio(b));
    let added = true;
    while (added) { added = false; for (const k of keys) { const r = groups[k].shift(); if (r) { out.push(r); added = true; } } }
  }
  return out;
}

export async function draftBriefings({ weekOf = weekOfFor(), clusters = null } = {}) {
  const db = getSupabaseAdmin();
  const result = { weekOf, drafted: [], skipped: [], trailers: [], errors: [] };

  const { data: journals, error: jErr } = await db.from('journals').select('cluster, pubmed_abbr, name, spoken_name, active').order('id');
  if (jErr) throw new Error(`journals: ${jErr.message}`);
  const { data: shows } = await db.from('briefing_shows').select('cluster, paused, trailer_briefing_id');
  const showBy = Object.fromEntries((shows || []).map(s => [s.cluster, s]));
  const { data: existing } = await db.from('briefings').select('id, cluster, kind, status').or(`week_of.eq.${weekOf},kind.eq.trailer`);
  const hasWeekly = new Set((existing || []).filter(b => b.kind === 'weekly').map(b => b.cluster));
  const hasTrailer = new Set((existing || []).filter(b => b.kind === 'trailer' && b.status !== 'failed').map(b => b.cluster));

  const windowStart = new Date(`${weekOf}T00:00:00Z`); windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  const windowEnd = new Date(`${weekOf}T00:00:00Z`); windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  for (const c of CLUSTERS) {
    if (clusters && !clusters.includes(c.key)) continue;
    const js = journals.filter(j => j.cluster === c.key);
    if (!js.some(j => j.active)) continue;
    if (showBy[c.key]?.paused) { result.skipped.push({ cluster: c.key, reason: 'paused' }); continue; }
    const spoken = Object.fromEntries(js.map(j => [j.pubmed_abbr, j.spoken_name]));
    const label = c.label.toLowerCase();
    try {
      // Trailer first, once per show.
      if (!hasTrailer.has(c.key)) {
        const script = buildTrailerScript({ show: c.show, label, journalNames: js.map(j => j.name.replace(/^The /, 'the ')).map(n => (/^(the|JADA|CRANIO)/i.test(n) ? n : `the ${n}`)) });
        const { data: tr, error } = await db.from('briefings').insert({
          cluster: c.key, kind: 'trailer', week_of: weekOf, status: 'draft', title: `${c.show}: what this show is`,
          script, drafted_at: new Date().toISOString(),
        }).select('id').single();
        if (error) throw new Error(`trailer insert: ${error.message}`);
        await db.from('briefing_shows').upsert({ cluster: c.key, trailer_briefing_id: tr.id, updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
        result.trailers.push({ cluster: c.key, id: tr.id });
      }
      if (hasWeekly.has(c.key)) continue;

      const { data: rows, error } = await db.from('articles')
        .select('id, title, authors, abstract, journal_abbr, journal_name, url, rank_tier, received_at, cluster, status')
        .contains('clusters', [c.key])
        .is('cluster', null)
        .eq('status', 'new')
        .gte('received_at', windowStart.toISOString())
        .lt('received_at', windowEnd.toISOString())
        .limit(200);
      if (error) throw new Error(`articles: ${error.message}`);
      const usable = (rows || []).filter(r => Array.isArray(r.abstract) && r.abstract.length);
      if (!usable.length) {
        await db.from('briefings').insert({ cluster: c.key, kind: 'weekly', week_of: weekOf, status: 'skipped', title: `${c.show}: nothing new this week`, drafted_at: new Date().toISOString() });
        result.skipped.push({ cluster: c.key, reason: 'no new papers' });
        continue;
      }
      const ordered = orderArticles(usable, js.map(j => j.pubmed_abbr));
      const fullReads = ordered.slice(0, FULL_READS);
      const headlines = ordered.slice(FULL_READS);
      const script = buildWeeklyScript({ show: c.show, label, weekOf, fullReads, headlines, spokenName: abbr => spoken[abbr] });
      const lead = cleanTitle(fullReads[0].title);
      const title = `Week of ${new Date(`${weekOf}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}: ${lead}${ordered.length > 1 ? `, plus ${ordered.length - 1} more` : ''}`;
      const { data: b, error: bErr } = await db.from('briefings').insert({
        cluster: c.key, kind: 'weekly', week_of: weekOf, status: 'draft', title,
        script, article_ids: fullReads.map(a => a.id), headline_ids: headlines.map(a => a.id),
        checks: { estimated_seconds: estimateSeconds(script), papers: ordered.length },
        drafted_at: new Date().toISOString(),
      }).select('id').single();
      if (bErr) throw new Error(`briefing insert: ${bErr.message}`);
      await db.from('articles').update({ status: 'scheduled', cluster: c.key, briefing_id: b.id, updated_at: new Date().toISOString() }).in('id', ordered.map(a => a.id));
      result.drafted.push({ cluster: c.key, id: b.id, papers: ordered.length, fullReads: fullReads.length, estimatedSeconds: estimateSeconds(script) });
    } catch (e) {
      result.errors.push({ cluster: c.key, error: String(e.message || e) });
    }
  }
  return result;
}
