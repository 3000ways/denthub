// Journal Briefings — nightly harvest of new papers from the specialty journals.
//
// For each active journal (least-recently harvested first), ask PubMed what
// arrived since the last run (14-day overlap so nothing slips through; 60 days
// on a journal's first run), fetch the new records, drop non-papers (letters,
// editorials, errata…), and upsert them into `articles` with their reading
// tier and the clusters they belong to. Then, for articles that have a DOI but
// no open-access check yet, ask Unpaywall whether a legal free copy exists.
//
// Time-boxed so it fits a Vercel cron invocation; whatever is left is picked up
// on the next run. Server-only (service-role client).

import { getSupabaseAdmin } from './supabase-admin';
import { searchJournal, fetchArticles } from './pubmed';
import { lookupOpenAccess } from './unpaywall';
import { rankTier, isExcludedPubType, CLUSTERS } from './journals';
import { createHash } from 'crypto';

const OVERLAP_DAYS   = 14;
const FIRST_RUN_DAYS = 60;
const FETCH_BATCH    = 50;   // PMIDs per efetch call
const OA_PER_RUN     = 40;   // Unpaywall lookups per run (polite)
const PACE_MS        = process.env.NCBI_API_KEY ? 120 : 400; // 10/s with a key, ~3/s without

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Every cluster whose journal list includes this PubMed abbreviation.
function clustersFor(pubmedAbbr) {
  return CLUSTERS.filter(c => c.journals.some(j => j.pubmed_abbr === pubmedAbbr)).map(c => c.key);
}

export async function harvestJournals({ timeBudgetMs = 40000, limit = 50 } = {}) {
  const db = getSupabaseAdmin();
  const started = Date.now();
  const left = () => timeBudgetMs - (Date.now() - started);

  const { data: journals, error } = await db.from('journals')
    .select('id, cluster, pubmed_abbr, name, search_filter, last_harvested_at, article_count')
    .eq('active', true)
    .order('last_harvested_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`journals: ${error.message}`);

  // One PubMed query per distinct abbreviation (a journal shared by several
  // clusters is harvested once; its rows are tagged with every cluster).
  const seen = new Set();
  const summary = { journals: 0, found: 0, inserted: 0, updated: 0, excluded: 0, oaChecked: 0, errors: [], elapsedMs: 0 };

  for (const j of journals) {
    if (seen.has(j.pubmed_abbr)) continue;
    if (left() < 8000) break;
    seen.add(j.pubmed_abbr);
    summary.journals++;
    try {
      const since = j.last_harvested_at
        ? new Date(new Date(j.last_harvested_at).getTime() - OVERLAP_DAYS * 86400000)
        : new Date(Date.now() - FIRST_RUN_DAYS * 86400000);
      const { ids, count } = await searchJournal({ pubmedAbbr: j.pubmed_abbr, from: since, filter: j.search_filter || '' });
      summary.found += count;
      await sleep(PACE_MS);

      // Skip PMIDs we already hold (cheap: one select).
      let newIds = ids;
      if (ids.length) {
        const { data: have } = await db.from('articles').select('pmid').in('pmid', ids);
        const haveSet = new Set((have || []).map(r => r.pmid));
        newIds = ids.filter(id => !haveSet.has(id));
      }

      const clusters = clustersFor(j.pubmed_abbr);
      for (let i = 0; i < newIds.length && left() > 5000; i += FETCH_BATCH) {
        const batch = await fetchArticles(newIds.slice(i, i + FETCH_BATCH));
        await sleep(PACE_MS);
        const rows = [];
        for (const a of batch) {
          if (isExcludedPubType(a.pub_types) || !a.title) { summary.excluded++; continue; }
          rows.push({
            pmid: a.pmid, doi: a.doi, pmc: a.pmc,
            journal_abbr: a.journal_abbr || j.pubmed_abbr, journal_name: a.journal_name,
            title: a.title, authors: a.authors, abstract: a.abstract, pub_types: a.pub_types,
            rank_tier: rankTier(a.pub_types),
            received_at: a.received_at, published_at: a.published_at,
            url: a.url, pubmed_url: a.pubmed_url,
            clusters,
            updated_at: new Date().toISOString(),
          });
        }
        if (rows.length) {
          const { error: upErr } = await db.from('articles').upsert(rows, { onConflict: 'pmid', ignoreDuplicates: true });
          if (upErr) throw new Error(`articles upsert: ${upErr.message}`);
          summary.inserted += rows.length;
        }
      }

      // Journals sharing this abbreviation all get the same stamp.
      const { count: total } = await db.from('articles').select('id', { count: 'exact', head: true }).eq('journal_abbr', j.pubmed_abbr);
      await db.from('journals').update({
        last_harvested_at: new Date().toISOString(), last_status: 'ok', last_error: null,
        article_count: total || 0, updated_at: new Date().toISOString(),
      }).eq('pubmed_abbr', j.pubmed_abbr);
    } catch (e) {
      summary.errors.push({ journal: j.pubmed_abbr, error: String(e.message || e) });
      await db.from('journals').update({ last_harvested_at: new Date().toISOString(), last_status: 'error', last_error: String(e.message || e).slice(0, 500) }).eq('pubmed_abbr', j.pubmed_abbr);
    }
  }

  // Open-access checks for articles that have never been checked.
  if (left() > 6000) {
    const { data: pending } = await db.from('articles')
      .select('id, doi').is('oa_checked_at', null).not('doi', 'is', null)
      .order('received_at', { ascending: false, nullsFirst: false }).limit(OA_PER_RUN);
    for (const a of pending || []) {
      if (left() < 4000) break;
      const oa = await lookupOpenAccess(a.doi);
      if (!oa.checked) continue; // try again next night
      await db.from('articles').update({ oa_status: oa.oa_status, oa_url: oa.oa_url, oa_license: oa.license, oa_host_type: oa.host_type, oa_checked_at: new Date().toISOString() }).eq('id', a.id);
      summary.oaChecked++;
      await sleep(150);
    }
  }

  summary.elapsedMs = Date.now() - started;
  return summary;
}

// Status for the admin tab: journals with counts, and this week's pipeline.
export async function getJournalStatus() {
  const db = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: journals }, { data: recent }, { data: briefings }] = await Promise.all([
    db.from('journals').select('*').order('cluster').order('id'),
    db.from('articles').select('id, pmid, title, authors, journal_abbr, rank_tier, received_at, oa_status, clusters, status, url')
      .gte('received_at', weekAgo).order('received_at', { ascending: false }).limit(300),
    db.from('briefings').select('id, cluster, kind, week_of, status, title, duration_seconds, cost_cents, cost_breakdown, published_at, error, episode_id, article_ids, headline_ids, checks, audio_url, rendered_at, preview_url, preview_at, preview_meta')
      .order('week_of', { ascending: false }).order('id', { ascending: false }).limit(80),
  ]);
  const { data: shows } = await db.from('briefing_shows').select('*');
  const perJournal = {};
  for (const a of recent || []) perJournal[a.journal_abbr] = (perJournal[a.journal_abbr] || 0) + 1;
  const { count: totalArticles } = await db.from('articles').select('id', { count: 'exact', head: true });
  const { count: oaOpen } = await db.from('articles').select('id', { count: 'exact', head: true }).in('oa_status', ['open', 'manuscript']);
  return {
    journals: (journals || []).map(j => ({ ...j, last7: perJournal[j.pubmed_abbr] || 0 })),
    recent: recent || [],
    briefings: briefings || [],
    totals: { articles: totalArticles || 0, openAccess: oaOpen || 0 },
    // intro_preview_stale: the saved introduction changed after the last audio preview.
    shows: Object.fromEntries((shows || []).map(x => [x.cluster, { ...x, intro_preview_stale: !!(x.intro_preview_hash && x.intro_script && createHash('sha256').update(x.intro_script).digest('hex') !== x.intro_preview_hash) }])),
    clusters: CLUSTERS.map(c => ({ key: c.key, label: c.label, show: c.show })),
  };
}
