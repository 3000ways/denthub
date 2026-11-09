// The podcast RSS feed for one show: /api/podcast/endo.xml (the ".xml" suffix
// is part of the dynamic segment). Public, CDN-cached; reads only published
// briefings through the anon client. Episode description text comes from the
// episodes row we publish (the show notes), so the feed matches the site.

import { supabase } from '../../../lib/supabase';
import { findCluster } from '../../../lib/journals';
import { getShowPublic, listPublishedBriefings } from '../../../lib/briefings-public';
import { buildFeedXml } from '../../../lib/podcast-feed';
import { setCdnCache } from '../../../lib/cdn-cache';

export default async function handler(req, res) {
  const key = String(req.query.cluster || '').replace(/\.xml$/i, '');
  const c = findCluster(key);
  if (!c) return res.status(404).send('No such show');
  try {
    const [show, briefings] = await Promise.all([getShowPublic(key), listPublishedBriefings(key)]);
    const epIds = briefings.map(b => b.episode_id).filter(Boolean);
    let notes = {};
    if (epIds.length) {
      const { data } = await supabase.from('episodes').select('id, description').in('id', epIds);
      notes = Object.fromEntries((data || []).map(e => [e.id, e.description]));
    }
    // Enclosure byte length: stored by the render job; for anything older, one HEAD request (cached by the CDN with the feed).
    const items = await Promise.all(briefings.map(async b => {
      let bytes = b.audio_bytes;
      if (!bytes) { try { const r = await fetch(b.audio_url, { method: 'HEAD', signal: AbortSignal.timeout(4000) }); bytes = Number(r.headers.get('content-length')) || 0; } catch { bytes = 0; } }
      return { ...b, audio_bytes: bytes, notes: notes[b.episode_id] || '' };
    }));
    const xml = buildFeedXml({ show: c, row: show?.row || null, items });
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    setCdnCache(res, 600);
    return res.status(200).send(xml);
  } catch (e) {
    console.error('[podcast feed]', e.message);
    return res.status(500).send('Feed unavailable');
  }
}
