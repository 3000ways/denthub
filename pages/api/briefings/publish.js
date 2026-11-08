// Journal Briefings — the render job reports back here: a rendered episode to
// publish, or a failure to record. Publishing means: make sure the show exists
// as a resource, insert the episode row (that is what the player, search, the
// home row and the specialty picker read), mark the papers, alert Andrei with
// the cost. Guard: CRON_SECRET or admin cookie.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { adminCreateResource } from '../../../lib/resources-db-admin';
import { sendOwnerAlert, ADMIN_URL } from '../../../lib/notify';
import { CLUSTERS, findCluster } from '../../../lib/journals';
import { findPick } from '../../../lib/specialties';
import { showNotes } from '../../../lib/briefing-script';
import { authorized } from './draft';

const SITE = 'https://thedentalcommute.com';

// The show's `resources` row: created once per cluster on first publish.
export async function ensureShowResource(db, cluster) {
  const { data: existing } = await db.from('briefing_shows').select('resource_id').eq('cluster', cluster).maybeSingle();
  if (existing && existing.resource_id) return existing.resource_id;
  const c = findCluster(cluster);
  if (!c) throw new Error(`unknown cluster ${cluster}`);
  const pick = findPick(c.pick);
  const rec = await adminCreateResource({
    Name: c.show,
    Type: 'Podcast',
    Status: 'Published',
    Description: `A weekly, AI-narrated briefing on the week's new research in ${c.label.toLowerCase()} from ${c.journals.map(j => j.name).join(', ')}. Each paper is summarised in our own words with the authors' conclusion quoted; open-access abstracts are read as published. Narration is synthetic and disclosed in every episode. Independently produced by The Dental Commute; not affiliated with any journal or publisher.`,
    URL: `${SITE}/journals/${c.key}`,
    'RSS Feed URL': `${SITE}/api/podcast/${c.key}.xml`,
    'Host or Author': 'The Dental Commute',
    Source: 'tdc_original',
    'Voice Type': 'AI-generated',
    'Voice Status': 'Confirmed',
    ...(pick && pick.specialty ? { Specialty: [pick.specialty] } : {}),
  });
  await db.from('briefing_shows').upsert({ cluster, resource_id: rec.id, updated_at: new Date().toISOString() }, { onConflict: 'cluster' });
  return rec.id;
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body || {};
  const id = Number(body.briefing_id);
  if (!id) return res.status(400).json({ error: 'briefing_id required' });
  const db = getSupabaseAdmin();
  try {
    const { data: b, error } = await db.from('briefings').select('*').eq('id', id).single();
    if (error || !b) return res.status(404).json({ error: 'briefing not found' });
    const c = findCluster(b.cluster) || { show: b.cluster, label: b.cluster, pick: null };

    // ── failure path ──────────────────────────────────────────────────────
    if (body.status === 'failed') {
      await db.from('briefings').update({ status: 'failed', error: String(body.error || 'render failed').slice(0, 1000), checks: body.checks || b.checks, updated_at: new Date().toISOString() }).eq('id', id);
      await sendOwnerAlert({
        subject: `Briefing failed: ${c.show} (${b.kind}, week of ${b.week_of})`,
        text: [`The render job could not publish this episode, so nothing went out.`, '', `Reason: ${String(body.error || 'unknown').slice(0, 800)}`, '', `Fix and re-run from GitHub Actions ("Render briefings"), or review in the admin: ${ADMIN_URL}`].join('\n'),
      });
      return res.status(200).json({ ok: true, status: 'failed' });
    }

    // ── publish path ──────────────────────────────────────────────────────
    const audioUrl = String(body.audio_url || '');
    const duration = Math.round(Number(body.duration_seconds || 0));
    if (!audioUrl.startsWith('https://') || !duration) return res.status(400).json({ error: 'audio_url and duration_seconds required' });

    const resourceId = await ensureShowResource(db, b.cluster);
    const ids = [...(b.article_ids || []), ...(b.headline_ids || [])];
    let arts = [];
    if (ids.length) { const { data } = await db.from('articles').select('id, title, authors, url, journal_abbr, journal_name, read_mode, oa_license').in('id', ids); arts = data || []; }
    const byId = Object.fromEntries(arts.map(a => [a.id, a]));
    const fullReads = (b.article_ids || []).map(i => byId[i]).filter(Boolean);
    const headlines = (b.headline_ids || []).map(i => byId[i]).filter(Boolean);
    const notes = showNotes({ show: c.show, weekOf: b.week_of, fullReads, headlines, kind: b.kind });
    const pick = findPick(c.pick);
    const title = b.kind === 'trailer' ? `Trailer: what ${c.show} is` : (b.title || `Week of ${b.week_of}`);

    // Episode row: upsert on (show, guid) so a re-publish updates in place.
    const guid = `tdc:briefing:${b.id}`;
    const { data: ep, error: epErr } = await db.from('episodes').upsert({
      guid, show_resource_id: resourceId, show_name: c.show, title,
      description: notes.slice(0, 4000), audio_url: audioUrl, image: null,
      published_at: new Date().toISOString(), duration_seconds: duration,
      quiz_tags: pick ? [pick.tag] : null, quiz_tagged_at: pick ? new Date().toISOString() : null,
    }, { onConflict: 'show_resource_id,guid' }).select('id').single();
    if (epErr) throw new Error(`episode upsert: ${epErr.message}`);
    await db.from('episodes').update({ link: `${SITE}/episode/${ep.id}` }).eq('id', ep.id);

    const now = new Date().toISOString();
    await db.from('briefings').update({
      status: 'published', audio_url: audioUrl, duration_seconds: duration,
      chapters: Array.isArray(body.chapters) ? body.chapters : [],
      cost_cents: Number(body.cost_cents || 0), cost_breakdown: body.cost_breakdown || {},
      checks: body.checks || b.checks, episode_id: ep.id, error: null,
      rendered_at: body.rendered_at || now, published_at: now, updated_at: now,
    }).eq('id', id);
    if (b.article_ids?.length) await db.from('articles').update({ status: 'read', updated_at: now }).in('id', b.article_ids);
    if (b.headline_ids?.length) await db.from('articles').update({ status: 'headline_only', updated_at: now }).in('id', b.headline_ids);
    await db.from('briefing_shows').update({ last_published_at: now, updated_at: now }).eq('cluster', b.cluster);

    const cents = Number(body.cost_cents || 0);
    const cached = body.cost_breakdown && body.cost_breakdown.cached_segments;
    const llm = Number((body.cost_breakdown && body.cost_breakdown.llm_cents) || 0);
    const modeCount = {};
    for (const a of fullReads) modeCount[a.read_mode || 'hybrid'] = (modeCount[a.read_mode || 'hybrid'] || 0) + 1;
    const modeWords = { hybrid: 'summarised', verbatim: 'abstract read in full', verbatim_nd: 'abstract read in full', quote_only: 'title + conclusion only' };
    const modesLine = fullReads.length ? ` (${Object.entries(modeCount).map(([k, v]) => `${v} ${modeWords[k] || k}`).join(', ')})` : '';
    await sendOwnerAlert({
      subject: `Published: ${c.show} · ${Math.round(duration / 60)} min · $${(cents / 100).toFixed(2)}`,
      text: [
        `${title}`, '',
        `${fullReads.length} paper${fullReads.length === 1 ? '' : 's'} in depth${modesLine}${headlines.length ? `, ${headlines.length} in brief` : ''} · ${Math.round(duration / 60)} min · cost $${(cents / 100).toFixed(2)}${llm ? ` (summaries $${(llm / 100).toFixed(2)})` : ''}${cached ? ` (${cached} cached segments saved $${((body.cost_breakdown.saved_cents || 0) / 100).toFixed(2)})` : ''}`,
        '', `Listen: ${SITE}/episode/${ep.id}`, `Admin: ${ADMIN_URL}`,
      ].join('\n'),
    });
    return res.status(200).json({ ok: true, status: 'published', episode_id: ep.id, resource_id: resourceId, link: `${SITE}/episode/${ep.id}` });
  } catch (err) {
    console.error('[briefings/publish] error:', err.message);
    return res.status(500).json({ error: String(err.message || err) });
  }
}

export { CLUSTERS };
