// Journal Briefings — what the render job needs: every drafted briefing with
// its script, the papers it reads (for chapters and show notes), the journals'
// spoken names and the pronunciation dictionary. Guard: CRON_SECRET or admin.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { authorized } from './draft';
import { VOICES, TTS_MODEL, TTS_SPEED } from '../../../lib/briefing-script';
import { CLUSTERS } from '../../../lib/journals';

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const db = getSupabaseAdmin();
    const retryFailed = req.query.retry === '1';
    const statuses = retryFailed ? ['draft', 'failed'] : ['draft'];
    const { data: briefings, error } = await db.from('briefings')
      .select('id, cluster, kind, week_of, status, title, script, article_ids, headline_ids, checks')
      .in('status', statuses).order('kind', { ascending: true }).order('week_of');  // 'trailer' sorts before 'weekly': the introduction renders first
    if (error) throw new Error(error.message);

    const ids = [...new Set((briefings || []).flatMap(b => [...(b.article_ids || []), ...(b.headline_ids || [])]))];
    let articles = {};
    if (ids.length) {
      const { data } = await db.from('articles').select('id, title, authors, url, journal_abbr, journal_name, read_mode, oa_license').in('id', ids);
      for (const a of data || []) articles[a.id] = a;
    }
    const [{ data: pron }, { data: shows }] = await Promise.all([
      db.from('speech_pronunciations').select('term, spoken_as'),
      db.from('briefing_shows').select('cluster, paused'),
    ]);
    const paused = new Set((shows || []).filter(s => s.paused).map(s => s.cluster));
    return res.status(200).json({
      briefings: (briefings || []).filter(b => !paused.has(b.cluster)).map(b => ({ ...b, show: (CLUSTERS.find(c => c.key === b.cluster) || {}).show || b.cluster })),
      articles,
      pronunciations: (pron || []).map(p => ({ from: p.term, to: p.spoken_as })),
      voices: VOICES, model: TTS_MODEL, speed: TTS_SPEED,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
}
