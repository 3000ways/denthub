// The newest published episode of every show that has one (home row + hub).
// Public, CDN-cached 10 minutes.
import { listShowsWithEpisodes } from '../../../lib/briefings-public';
import { supabase } from '../../../lib/supabase';
import { setCdnCache } from '../../../lib/cdn-cache';

export default async function handler(req, res) {
  try {
    const shows = (await listShowsWithEpisodes()).filter(s => s.latest);
    const epIds = shows.map(s => s.latest.episode_id).filter(Boolean);
    let eps = {};
    if (epIds.length) {
      const { data } = await supabase.from('episodes').select('id, guid, title, audio_url, duration_seconds, published_at, show_resource_id, show_name, image').in('id', epIds);
      eps = Object.fromEntries((data || []).map(e => [e.id, e]));
    }
    const out = shows.map(s => ({
      cluster: s.key, show: s.show, label: s.label, artwork: s.artwork, artworkPath: s.artworkPath, url: `/journals/${s.key}`, episodes: s.episodes,
      latest: { briefing_id: s.latest.id, kind: s.latest.kind, title: s.latest.title, week_of: s.latest.week_of, published_at: s.latest.published_at, duration_seconds: s.latest.duration_seconds, audio_url: s.latest.audio_url, episode: eps[s.latest.episode_id] || null, href: `/briefing/${s.latest.id}` },
    }));
    setCdnCache(res, 600);
    return res.status(200).json({ shows: out });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
