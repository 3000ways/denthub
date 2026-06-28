// "Fix broken feeds" — admin-triggered agent.
//
// For shows whose harvest stored 0 episodes (dead/mislinked RSS URLs), ask
// Perplexity (web search) for the show's real RSS feed, VERIFY the candidate
// actually returns episodes, and only then write the corrected URL back to
// Airtable. The next harvest then pulls the show in.
//
// Runs on Vercel, so it can both fetch feeds (to verify) and update Airtable
// with AIRTABLE_PAT — no MCP / external permission needed. Processed in small
// batches so it fits the serverless time limit; click again for the next batch.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { resolveFeedUrl } from '../../../lib/harvester';

const BASE_ID  = process.env.AIRTABLE_BASE_ID  || 'appICV69R7tzizCDY';
const TABLE_ID = process.env.AIRTABLE_TABLE_ID || 'tblBlou0rXbImoQ75';

export const config = { maxDuration: 60 };

// Count of shows still considered broken (0 episodes, not a duplicate).
async function brokenCount(admin) {
  const { count } = await admin
    .from('harvest_state')
    .select('show_resource_id', { count: 'exact', head: true })
    .eq('episode_count', 0)
    .neq('last_status', 'duplicate');
  return count || 0;
}

async function brokenShows(admin, limit) {
  const { data } = await admin
    .from('harvest_state')
    .select('show_resource_id, show_name, feed_url')
    .eq('episode_count', 0)
    .neq('last_status', 'duplicate')
    .order('last_harvested_at', { ascending: true, nullsFirst: true })
    .limit(limit);
  return data || [];
}

async function askPerplexity(shows) {
  const list = shows
    .map((s, i) => `${i + 1}. "${s.show_name}" — current (broken) URL: ${s.feed_url || '(none)'}`)
    .join('\n');

  const prompt = `Find the CURRENT, WORKING RSS feed URL for each dental podcast below. Rules:
- Return the actual RSS feed (the XML feed URL, e.g. from Libsyn, Buzzsprout, Captivate, Transistor, Spotify/Anchor, Podbean, Art19, Simplecast).
- Do NOT return an Apple Podcasts page, a Spotify web page, a podcast directory, or the show's website homepage — only the raw RSS feed URL.
- If you cannot find a real, current RSS feed for a show, use an empty string for that show.

Podcasts:
${list}

Respond with ONLY a JSON array, one object per podcast in the SAME ORDER, each: {"name": "<show name>", "rssUrl": "<feed url or empty string>"}`;

  const aiRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'You find podcast RSS feed URLs. Respond with ONLY a valid JSON array — no markdown, no code fences, no explanation.' },
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

// Confirm a candidate URL is a real feed with at least one episode/entry.
async function validateFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TheDentalCommute/1.0 (+https://thedentalcommute.com)' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const xml = await res.text();
    return /<item[\s>]/i.test(xml) || /<entry[\s>]/i.test(xml);
  } catch { return false; }
}

async function updateAirtableFeed(recordId, url) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ id: recordId, fields: { 'RSS Feed URL': url } }], typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${(await res.text()).slice(0, 150)}`);
}

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json({ status: 'no_ai_key', message: 'Add PERPLEXITY_API_KEY in Vercel to enable this.' });
  }

  try {
    const admin = getSupabaseAdmin();
    const limit = Math.min(parseInt(req.body?.limit, 10) || 6, 10);
    const shows = await brokenShows(admin, limit);
    if (!shows.length) {
      return res.status(200).json({ status: 'ok', fixed: [], failed: [], remaining: 0, done: true });
    }

    const candidates = await askPerplexity(shows);
    const byName = new Map((candidates || []).map(c => [(c.name || '').toLowerCase().trim(), c.rssUrl]));

    const fixed = [];
    const failed = [];

    await Promise.all(shows.map(async (show, i) => {
      // Match by name, else fall back to positional order.
      let candidate = byName.get((show.show_name || '').toLowerCase().trim());
      if (!candidate && candidates[i]) candidate = candidates[i].rssUrl;
      candidate = (candidate || '').trim();
      if (!candidate) { failed.push({ show: show.show_name, reason: 'no feed found' }); return; }

      const resolved = await resolveFeedUrl(candidate); // handle Apple/rss.com/Spreaker links
      const ok = await validateFeed(resolved);
      if (!ok) { failed.push({ show: show.show_name, reason: 'candidate feed had no episodes', tried: resolved }); return; }

      try {
        await updateAirtableFeed(show.show_resource_id, resolved);
        // Reset state so the next harvest re-attempts this show first.
        await admin.from('harvest_state').update({
          feed_url: resolved,
          last_status: 'pending',
          last_error: null,
          last_harvested_at: null,
          updated_at: new Date().toISOString(),
        }).eq('show_resource_id', show.show_resource_id);
        fixed.push({ show: show.show_name, oldUrl: show.feed_url, newUrl: resolved });
      } catch (e) {
        failed.push({ show: show.show_name, reason: String(e.message || e) });
      }
    }));

    const remaining = Math.max(0, (await brokenCount(admin)) - fixed.length);
    return res.status(200).json({ status: 'ok', fixed, failed, remaining, done: remaining === 0 });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
