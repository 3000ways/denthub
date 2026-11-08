// "Fits your commute" — recent episodes that fit a drive of a given length.
//
// The brand promise is literally the commute, so the home page offers a
// 15 / 30 / 45+ minute pick and fills a carousel with fresh episodes of that
// length from the best-ranked podcasts (one per show, rank-ordered). Optional
// `?specialty=<pick key>` (lib/specialties.js) prefers that specialty's shows
// and falls back to the global set when it is too thin to fill a row.
//
// Buckets (minutes): 15 → 5–18, 30 → 18–38, 45 → 38–95. Episodes with no
// duration are excluded here (they can't be matched to a drive).

import { supabase } from '../../lib/supabase';
import { listPublishedResources } from '../../lib/resources-db';
import { isPublicAiVoice } from '../../lib/voice';
import { findPick, formatMinutes } from '../../lib/specialties';
import { setCdnCache } from '../../lib/cdn-cache';

export const BUCKETS = {
  15: { min: 5 * 60,  max: 18 * 60 },
  30: { min: 18 * 60, max: 38 * 60 },
  45: { min: 38 * 60, max: 95 * 60 },
};

const ROW_SIZE    = 12;
const MIN_SCOPED  = 6;      // a specialty row thinner than this falls back to global
const FRESH_DAYS  = 45;
const WIDE_DAYS   = 180;
const TOP_SHOWS   = 80;     // only the best-ranked podcasts feed the row
const FETCH_POOL  = 400;

const cache = new Map();    // `${bucket}|${pick}` → { data, at }
const TTL   = 60 * 60 * 1000;

function stripHtml(str) {
  return (str || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchEpisodes(showIds, bucket, sinceIso) {
  const { min, max } = BUCKETS[bucket];
  const { data, error } = await supabase
    .from('episodes')
    .select('id, show_resource_id, show_name, title, description, published_at, audio_url, image, guid, duration_seconds')
    .in('show_resource_id', showIds)
    .not('audio_url', 'is', null)
    .gte('duration_seconds', min)
    .lte('duration_seconds', max)
    .gte('published_at', sinceIso)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(FETCH_POOL);
  if (error) throw new Error(`episodes: ${error.message}`);
  return data || [];
}

// Newest matching episode per show, in show-rank order, capped at ROW_SIZE.
function buildRow(rows, shows) {
  const best = new Map();
  for (const e of rows) if (!best.has(e.show_resource_id)) best.set(e.show_resource_id, e);
  const items = [];
  for (const s of shows) {
    const e = best.get(s.id);
    if (!e) continue;
    const d = e.published_at ? new Date(e.published_at) : null;
    items.push({
      type:            'podcast',
      show:            s.name,
      resourceId:      s.id,
      episodeId:       e.id,
      title:           e.title || 'New episode',
      url:             e.audio_url,
      guid:            e.guid || e.audio_url,
      image:           e.image || s.image || null,
      date:            d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
      description:     stripHtml(e.description).slice(0, 140),
      duration:        formatMinutes(e.duration_seconds),
      durationSeconds: e.duration_seconds,
    });
    if (items.length >= ROW_SIZE) break;
  }
  return items;
}

async function build(bucket, pickKey) {
  const pick = findPick(pickKey);
  const records = await listPublishedResources({
    type: 'Podcast',
    select: 'id, name, final_score, specialty, voice_type, voice_status, image_url, auto_image_url',
  });
  const shows = records
    .filter(r => r.fields['Final Score'] != null && !isPublicAiVoice(r.fields))
    .map(r => ({
      id: r.id, name: r.fields.Name,
      image: r.fields['Image URL'] || r.fields['Auto Image URL'] || null,
      specialties: Array.isArray(r.fields.Specialty) ? r.fields.Specialty : [],
    }));
  const since = days => new Date(Date.now() - days * 86400000).toISOString();

  // Specialty-scoped attempt first (only when the pick maps to a resource specialty).
  if (pick && pick.specialty) {
    const spec = shows.filter(s => s.specialties.includes(pick.specialty)).slice(0, TOP_SHOWS);
    if (spec.length) {
      const ids = spec.map(s => s.id);
      let items = buildRow(await fetchEpisodes(ids, bucket, since(FRESH_DAYS)), spec);
      if (items.length < MIN_SCOPED) items = buildRow(await fetchEpisodes(ids, bucket, since(WIDE_DAYS)), spec);
      if (items.length >= MIN_SCOPED) return { items, bucket, pick: pick.key };
    }
  }

  const top = shows.slice(0, TOP_SHOWS);
  const ids = top.map(s => s.id);
  let items = buildRow(await fetchEpisodes(ids, bucket, since(FRESH_DAYS)), top);
  if (items.length < MIN_SCOPED) items = buildRow(await fetchEpisodes(ids, bucket, since(WIDE_DAYS)), top);
  return { items, bucket, pick: null };
}

export default async function handler(req, res) {
  const bucket = BUCKETS[req.query.bucket] ? Number(req.query.bucket) : 30;
  const pickKey = findPick(req.query.specialty) ? req.query.specialty : '';
  const key = `${bucket}|${pickKey}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    setCdnCache(res, 3600, { ageMs: Date.now() - hit.at });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(hit.data);
  }
  try {
    const data = await build(bucket, pickKey);
    if (data.items.length) cache.set(key, { data, at: Date.now() });
    setCdnCache(res, data.items.length ? 3600 : 60, data.items.length ? {} : { staleSec: 60 });
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[commute-episodes] error:', err.message);
    setCdnCache(res, 60, { staleSec: 60 });
    return res.status(200).json({ items: [], bucket, pick: null, error: 'unavailable' });
  }
}
