// Journal Briefings — what the PUBLIC site reads (anon client, RLS-limited:
// briefings only when status = published; articles, briefing_shows and active
// journals are public-read). Used by the feeds, the /journals hub, the
// /briefing/[id] page, the home row and the player's chapter lookup.

import { supabase } from './supabase';
import { CLUSTERS, findCluster } from './journals';
import { shortVersion, cleanTitle, spokenAuthors } from './briefing-script';

export { SITE, artworkUrl, artworkPath, feedUrl, showUrl, briefingUrl, chaptersUrl, showDescription } from './briefings-urls';
import { artworkUrl, artworkPath, feedUrl, showUrl, showDescription } from './briefings-urls';

const SHOW_COLS = 'cluster, resource_id, launched, paused, last_published_at, apple_url, spotify_url, feed_guid';
const BRIEFING_COLS = 'id, cluster, kind, week_of, status, title, audio_url, audio_bytes, duration_seconds, chapters, published_at, episode_id, article_ids, headline_ids, checks';

export async function getShowPublic(cluster) {
  const c = findCluster(cluster);
  if (!c) return null;
  const [{ data: row }, { data: journals }] = await Promise.all([
    supabase.from('briefing_shows').select(SHOW_COLS).eq('cluster', cluster).maybeSingle(),
    supabase.from('journals').select('pubmed_abbr, name, spoken_name, society, homepage').eq('cluster', cluster).order('id'),
  ]);
  return { ...c, row: row || null, journals: journals || [], artwork: artworkUrl(c.key), artworkPath: artworkPath(c.key), feed: feedUrl(c.key), url: showUrl(c.key), description: showDescription(c) };
}

export async function listPublishedBriefings(cluster, { limit = 100 } = {}) {
  const { data } = await supabase.from('briefings').select(BRIEFING_COLS)
    .eq('cluster', cluster).eq('status', 'published').not('audio_url', 'is', null)
    .order('published_at', { ascending: false }).limit(limit);
  return data || [];
}

// Every show with at least one published episode, newest first (hub + home row).
export async function listShowsWithEpisodes() {
  const [{ data: rows }, { data: latest }] = await Promise.all([
    supabase.from('briefing_shows').select(SHOW_COLS),
    supabase.from('briefings').select(BRIEFING_COLS).eq('status', 'published').not('audio_url', 'is', null).order('published_at', { ascending: false }).limit(200),
  ]);
  const byCluster = {};
  for (const b of latest || []) if (!byCluster[b.cluster]) byCluster[b.cluster] = { latest: b, count: 0 };
  for (const b of latest || []) byCluster[b.cluster].count++;
  const showRow = Object.fromEntries((rows || []).map(r => [r.cluster, r]));
  return CLUSTERS.map(c => ({
    key: c.key, show: c.show, label: c.label, pick: c.pick, journals: c.journals,
    row: showRow[c.key] || null, artwork: artworkUrl(c.key), artworkPath: artworkPath(c.key), feed: feedUrl(c.key), url: showUrl(c.key),
    description: showDescription(c), latest: byCluster[c.key]?.latest || null, episodes: byCluster[c.key]?.count || 0,
  }));
}

// One episode page's worth: the briefing, its papers (how each was covered,
// our summary, the authors' quoted conclusion), the show, and neighbours.
export async function getBriefingPublic(id) {
  const { data: b } = await supabase.from('briefings').select(BRIEFING_COLS).eq('id', id).eq('status', 'published').maybeSingle();
  if (!b) return null;
  const c = findCluster(b.cluster);
  const ids = [...(b.article_ids || []), ...(b.headline_ids || [])];
  const [{ data: arts }, { data: neighbours }, show] = await Promise.all([
    ids.length ? supabase.from('articles').select('id, title, authors, journal_abbr, journal_name, url, pubmed_url, abstract, read_mode, summary, oa_license, pub_types').in('id', ids) : { data: [] },
    supabase.from('briefings').select('id, title, week_of, kind, published_at').eq('cluster', b.cluster).eq('status', 'published').not('audio_url', 'is', null).order('published_at', { ascending: false }).limit(200),
    getShowPublic(b.cluster),
  ]);
  const byId = Object.fromEntries((arts || []).map(a => [a.id, a]));
  const paper = a => ({
    id: a.id, title: cleanTitle(a.title), authors: a.authors || [], by: spokenAuthors(a.authors), journal: a.journal_name || a.journal_abbr,
    url: a.url || a.pubmed_url || null, readMode: a.read_mode || 'hybrid', summary: a.summary || null,
    conclusion: shortVersion(a.abstract), licence: a.oa_license || null,
  });
  const list = neighbours || [];
  const i = list.findIndex(x => x.id === b.id);
  return {
    briefing: b, show: show || { ...c, artwork: artworkUrl(b.cluster), artworkPath: artworkPath(b.cluster), url: showUrl(b.cluster), feed: feedUrl(b.cluster) },
    fullReads: (b.article_ids || []).map(x => byId[x]).filter(Boolean).map(paper),
    headlines: (b.headline_ids || []).map(x => byId[x]).filter(Boolean).map(paper),
    newer: i > 0 ? list[i - 1] : null, older: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}

// Chapters for the player, by our episode row id.
export async function getChaptersForEpisode(episodeId) {
  const { data } = await supabase.from('briefings').select('id, chapters, cluster').eq('episode_id', episodeId).eq('status', 'published').maybeSingle();
  if (!data || !Array.isArray(data.chapters) || data.chapters.length < 2) return null;
  return { briefing_id: data.id, cluster: data.cluster, chapters: data.chapters.map(ch => ({ title: ch.title, start: Number(ch.start) || 0, article_id: ch.article_id || null })) };
}
