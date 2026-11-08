// "Today's commute" — the one playable episode in the home-page hero.
//
// Picks a recent episode from a top-ranked podcast so the first thing a visitor
// can do on the site is press Play. Deterministic per UTC day (rotates through
// the top shows so the same show isn't featured every day) and cacheable at
// the edge. Optional `?specialty=<pick key>` (see lib/specialties.js) prefers
// shows tagged with that specialty, falling back to the global pick when the
// specialty has too few recent episodes.
//
// Guards: never features a Confirmed AI-voice show (lib/voice.js gate), skips
// episodes with no audio, and prefers commute-length episodes (8–90 min) when
// the feed reports a duration.

import { supabase } from '../../lib/supabase';
import { listPublishedResources } from '../../lib/resources-db';
import { isPublicAiVoice } from '../../lib/voice';
import { findPick, formatMinutes } from '../../lib/specialties';
import { setCdnCache } from '../../lib/cdn-cache';

const TOP_SHOWS        = 30;                 // rotation pool = the top N podcasts
const MIN_SPECIALTY    = 3;                  // need this many specialty shows with fresh episodes, else fall back
const FRESH_DAYS       = 21;                 // "recent" window for the global pick
const WIDE_DAYS        = 120;                // wider window for thin specialties
const MIN_SEC          = 8 * 60;
const MAX_SEC          = 90 * 60;
const UP_NEXT          = 2;
const ROTATE           = 8;                  // rotate the hero only among the best N fresh candidates

const cache = new Map(); // pickKey → { data, at }
const TTL   = 60 * 60 * 1000;

function stripHtml(str) {
  return (str || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Cut at a sentence or word boundary so the card never ends mid-word.
function clip(text, max) {
  if (!text || text.length <= max) return text || '';
  const head = text.slice(0, max);
  const sentence = head.lastIndexOf('. ');
  if (sentence > max * 0.6) return head.slice(0, sentence + 1);
  const space = head.lastIndexOf(' ');
  return `${head.slice(0, space > 0 ? space : max).trimEnd()}…`;
}

function commuteLength(secs) {
  if (secs == null) return true;            // unknown duration: allow
  return secs >= MIN_SEC && secs <= MAX_SEC;
}

async function latestEpisodes(showIds, sinceIso) {
  const { data, error } = await supabase
    .from('episodes')
    .select('id, show_resource_id, show_name, title, description, published_at, audio_url, image, guid, duration_seconds')
    .in('show_resource_id', showIds)
    .not('audio_url', 'is', null)
    .gte('published_at', sinceIso)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(300);
  if (error) throw new Error(`episodes: ${error.message}`);
  return data || [];
}

// Newest commute-length episode per show, in the order of `showIds` (= rank).
function newestPerShow(rows, showIds) {
  const best = new Map();
  for (const e of rows) {
    if (best.has(e.show_resource_id)) continue;
    if (!commuteLength(e.duration_seconds)) continue;
    best.set(e.show_resource_id, e);
  }
  return showIds.map(id => best.get(id)).filter(Boolean);
}

function shape(ep, show) {
  const d = ep.published_at ? new Date(ep.published_at) : null;
  return {
    id:               ep.id,
    title:            ep.title || 'New episode',
    description:      clip(stripHtml(ep.description), 460),
    audio_url:        ep.audio_url,
    image:            ep.image || show.image || null,
    guid:             ep.guid || ep.audio_url,
    published_at:     ep.published_at,
    date:             d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
    duration_seconds: ep.duration_seconds || null,
    duration:         formatMinutes(ep.duration_seconds),
    show_name:        show.name,
    show_resource_id: show.id,
    show: {
      id:    show.id,
      name:  show.name,
      host:  show.host || null,
      rank:  show.rank,
      score: show.score,
      image: show.image || null,
    },
  };
}

async function build(pickKey) {
  const pick = findPick(pickKey);
  const records = await listPublishedResources({
    type: 'Podcast',
    select: 'id, name, final_score, specialty, voice_type, voice_status, image_url, auto_image_url, host_or_author',
  });

  // Rank = position in the score-ordered podcast list (unscored shows excluded).
  const shows = records
    .filter(r => r.fields['Final Score'] != null && !isPublicAiVoice(r.fields))
    .map((r, i) => ({
      id:    r.id,
      name:  r.fields.Name,
      host:  r.fields['Host or Author'] || null,
      score: Math.round(r.fields['Final Score']),
      rank:  i + 1,
      image: r.fields['Image URL'] || r.fields['Auto Image URL'] || null,
      specialties: Array.isArray(r.fields.Specialty) ? r.fields.Specialty : [],
    }));
  if (!shows.length) return null;

  const daySeed = Math.floor(Date.now() / 86400000);
  const since = days => new Date(Date.now() - days * 86400000).toISOString();

  // 1. Specialty-scoped attempt (only when the pick has a resource-level specialty).
  let pool = null;
  let scoped = false;
  if (pick && pick.specialty) {
    const specShows = shows.filter(s => s.specialties.includes(pick.specialty)).slice(0, TOP_SHOWS);
    if (specShows.length) {
      const ids = specShows.map(s => s.id);
      let rows = await latestEpisodes(ids, since(FRESH_DAYS));
      let eps = newestPerShow(rows, ids);
      if (eps.length < MIN_SPECIALTY) {
        rows = await latestEpisodes(ids, since(WIDE_DAYS));
        eps = newestPerShow(rows, ids);
      }
      if (eps.length >= 1) { pool = { shows: specShows, eps }; scoped = true; }
    }
  }

  // 2. Global pick: the top shows with something fresh.
  if (!pool) {
    const topShows = shows.slice(0, TOP_SHOWS);
    const ids = topShows.map(s => s.id);
    let rows = await latestEpisodes(ids, since(FRESH_DAYS));
    let eps = newestPerShow(rows, ids);
    if (!eps.length) {
      rows = await latestEpisodes(ids, since(WIDE_DAYS));
      eps = newestPerShow(rows, ids);
    }
    if (!eps.length) return null;
    pool = { shows: topShows, eps };
  }

  const byId = new Map(pool.shows.map(s => [s.id, s]));
  // Rotate through the best few fresh candidates by day so the hero isn't the
  // same show all week; `eps` is rank-ordered, so the rotation never leaves the
  // top of the ranking. Everything else stays in rank order behind the pick.
  const head = pool.eps.slice(0, ROTATE);
  const tail = pool.eps.slice(ROTATE);
  const start = head.length ? daySeed % head.length : 0;
  const rotated = [...head.slice(start), ...head.slice(0, start), ...tail];
  const [first, ...rest] = rotated;

  return {
    episode: shape(first, byId.get(first.show_resource_id)),
    upNext:  rest.slice(0, UP_NEXT).map(e => shape(e, byId.get(e.show_resource_id))),
    pick:    scoped ? pick.key : null,
    generatedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  const pickKey = findPick(req.query.specialty) ? req.query.specialty : '';
  const hit = cache.get(pickKey);
  if (hit && Date.now() - hit.at < TTL) {
    setCdnCache(res, 3600, { ageMs: Date.now() - hit.at });
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(hit.data);
  }
  try {
    const data = await build(pickKey);
    if (!data) {
      setCdnCache(res, 60, { staleSec: 60 });
      return res.status(200).json({ episode: null, upNext: [], pick: null });
    }
    cache.set(pickKey, { data, at: Date.now() });
    setCdnCache(res, 3600);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[featured-episode] error:', err.message);
    setCdnCache(res, 60, { staleSec: 60 });
    return res.status(200).json({ episode: null, upNext: [], pick: null, error: 'unavailable' });
  }
}
