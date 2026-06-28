// "Fix broken feeds" — admin-triggered agent.
//
// For shows whose harvest stored 0 episodes (dead/mislinked RSS URLs), find the
// show's real RSS feed, VERIFY it actually returns episodes, then write the
// corrected URL to Airtable so the next harvest pulls it in.
//
// Lookup order:
//   1. Apple's iTunes Search API — deterministic, returns the exact feedUrl for
//      any podcast listed on Apple (no AI guessing). Name-matched for safety.
//   2. Perplexity (web search) as a fallback for shows not found on Apple.
// Every candidate is fetched with a browser User-Agent and must contain
// episodes before it's saved — so a wrong/empty URL never gets written.
//
// Runs on Vercel, so it can fetch feeds (to verify) and update Airtable with
// AIRTABLE_PAT directly. Batched to fit the serverless time limit.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { resolveFeedUrl } from '../../../lib/harvester';

const BASE_ID  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const config = { maxDuration: 60 };

// ─── name matching (guards against grabbing a different show's feed) ──────────
function normName(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(the|a|an|podcast|show)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function nameMatch(a, b) {
  const ta = normName(a).split(' ').filter(Boolean);
  const tb = normName(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.join(' ') === long.join(' ')) return true;
  return short.length >= 2 && short.every(t => long.includes(t)); // shorter fully inside longer
}

// ─── feed verification (browser UA — hosts often block bots) ──────────────────
async function validateFeed(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const xml = await res.text();
    return /<item[\s>]/i.test(xml) || /<entry[\s>]/i.test(xml);
  } catch { return false; }
}

// ─── lookups ─────────────────────────────────────────────────────────────────
async function itunesCandidates(name) {
  try {
    const r = await fetch(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=5&term=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.collectionName, feedUrl: x.feedUrl })).filter(x => x.feedUrl);
  } catch { return []; }
}

async function askPerplexity(shows) {
  const list = shows.map((s, i) => `${i + 1}. "${s.show_name}" — current (broken) URL: ${s.feed_url || '(none)'}`).join('\n');
  const prompt = `Find the CURRENT, WORKING RSS feed URL (the raw XML feed, e.g. Libsyn/Buzzsprout/Captivate/Transistor/Spotify/Podbean/Art19/Simplecast) for each dental podcast below. Do NOT return an Apple Podcasts page, a Spotify web page, a directory, or the show's homepage. If you can't find a real current RSS feed, use an empty string.

Podcasts:
${list}

Respond with ONLY a JSON array, one object per podcast in the SAME ORDER: {"name":"<show name>","rssUrl":"<feed url or empty>"}`;

  const aiRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You find podcast RSS feed URLs. Respond with ONLY a valid JSON array — no markdown, no code fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
  });
  if (!aiRes.ok) throw new Error(`Perplexity error: ${(await aiRes.text()).slice(0, 200)}`);
  const data = await aiRes.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').replace(/\[\d+\]/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) { try { return JSON.parse(m[0]); } catch {} } }
  return [];
}

// Find a verified feed for one show via Apple first.
async function findViaItunes(show) {
  const cands = await itunesCandidates(show.show_name);
  for (const c of cands.slice(0, 4)) {
    if (nameMatch(show.show_name, c.name) && await validateFeed(c.feedUrl)) return c.feedUrl;
  }
  return null;
}

// ─── writes ──────────────────────────────────────────────────────────────────
async function applyFix(admin, show, url) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ id: show.show_resource_id, fields: { 'RSS Feed URL': url } }], typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 150)}`);
  await admin.from('harvest_state').update({
    feed_url: url, last_status: 'pending', last_error: null, last_harvested_at: null,
    updated_at: new Date().toISOString(),
  }).eq('show_resource_id', show.show_resource_id);
}

// Still needs a feed found: 0 episodes, not a duplicate, and not already fixed
// this session (status 'pending' = fixed, awaiting the next harvest).
async function brokenCount(admin) {
  const { count } = await admin.from('harvest_state')
    .select('show_resource_id', { count: 'exact', head: true })
    .eq('episode_count', 0).neq('last_status', 'duplicate').neq('last_status', 'pending');
  return count || 0;
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const admin = getSupabaseAdmin();
    const limit = Math.min(parseInt(req.body?.limit, 10) || 6, 10);
    const { data: shows } = await admin.from('harvest_state')
      .select('show_resource_id, show_name, feed_url')
      .eq('episode_count', 0).neq('last_status', 'duplicate').neq('last_status', 'pending')
      .order('last_harvested_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (!shows || !shows.length) {
      return res.status(200).json({ status: 'ok', fixed: [], failed: [], remaining: 0, done: true });
    }

    const fixed = [];
    const failed = [];

    // Pass 1 — Apple directory (deterministic), in parallel.
    const pass1 = await Promise.all(shows.map(async show => ({ show, url: await findViaItunes(show) })));
    const needAI = [];
    for (const { show, url } of pass1) {
      if (url) {
        try { await applyFix(admin, show, url); fixed.push({ show: show.show_name, newUrl: url, via: 'Apple' }); }
        catch (e) { failed.push({ show: show.show_name, reason: String(e.message || e) }); }
      } else {
        needAI.push(show);
      }
    }

    // Pass 2 — Perplexity fallback for the rest.
    if (needAI.length && process.env.PERPLEXITY_API_KEY) {
      let cands = [];
      try { cands = await askPerplexity(needAI); } catch (e) { /* report per-show below */ }
      const byName = new Map((cands || []).map(c => [(c.name || '').toLowerCase().trim(), c.rssUrl]));
      await Promise.all(needAI.map(async (show, i) => {
        let cand = byName.get((show.show_name || '').toLowerCase().trim());
        if (!cand && cands[i]) cand = cands[i].rssUrl;
        cand = (cand || '').trim();
        if (!cand) { failed.push({ show: show.show_name, reason: 'no feed found' }); return; }
        const resolved = await resolveFeedUrl(cand);
        if (!(await validateFeed(resolved))) { failed.push({ show: show.show_name, reason: 'candidate feed had no episodes' }); return; }
        try { await applyFix(admin, show, resolved); fixed.push({ show: show.show_name, newUrl: resolved, via: 'AI' }); }
        catch (e) { failed.push({ show: show.show_name, reason: String(e.message || e) }); }
      }));
    } else if (needAI.length) {
      needAI.forEach(s => failed.push({ show: s.show_name, reason: 'not on Apple; AI fallback unavailable' }));
    }

    const remaining = await brokenCount(admin); // already excludes the just-fixed (now 'pending')
    return res.status(200).json({ status: 'ok', fixed, failed, remaining, done: remaining === 0 });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
