// AI Research agent — finds new dental resources for one subcategory per call.
//
// The admin picks a GROUP (e.g. "Podcasts") and the browser calls this endpoint
// once per subcategory in that group (index 0, 1, 2, …), looping until `done`.
// One subcategory per request keeps every call well under the 60s serverless cap
// even though a full group takes a few minutes — same pattern as the episode
// tagging backfill button.
//
// What it writes to Airtable: core fields only (Name, URL, Description, Type,
// Host, RSS, Image) + a deterministic Type/Specialty from the niche searched.
// It does NOT write scores (the scoring engine owns those) or quiz tags (the
// episode tagger owns those, per-episode, after approval + harvest). Results
// land as Source: AI Agent / Submission Status: Pending for admin review.

import { isAdminAuthenticated } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { RESEARCH_PLAN, RESEARCH_GROUPS, typeNoun } from '../../../lib/research-plan';

export const config = { maxDuration: 60 };

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

const TARGET_PER_SUBCATEGORY = 8;

// Domains that are directories/listing sites — never the resource itself
const DIRECTORY_DOMAINS = [
  'feedspot.com', 'podchaser.com', 'listennotes.com', 'chartable.com',
  'goodpods.com', 'podcastaddict.com', 'podbay.fm', 'podcastindex.org',
  'dentalpodcastreviews.com', 'rephonic.com', 'podcast.co', 'podcastrepublic.net',
  'player.fm', 'podtail.com', 'podyssey.fm', 'podcastguru.app',
];

function isDirectoryUrl(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return DIRECTORY_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return false; }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return (url || '').toLowerCase().trim();
  }
}

// Fetch existing Published/Pending resources for dedup — skip Rejected so they
// can be re-suggested. Also collect RSS feed URLs so the same podcast listed on
// a different platform (its site vs Apple vs Spotify) is caught by feed match.
async function fetchExistingResources() {
  let records = [];
  let offset;
  do {
    const params = new URLSearchParams({
      pageSize: '100',
      filterByFormula: `NOT({Submission Status}="Rejected")`,
    });
    params.append('fields[]', 'Name');
    params.append('fields[]', 'URL');
    params.append('fields[]', 'RSS Feed URL');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch error ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  const names = new Set(records.map(r => (r.fields.Name || '').toLowerCase().trim()).filter(Boolean));
  const urls  = new Set(records.map(r => normalizeUrl(r.fields.URL || '')).filter(Boolean));
  const feeds = new Set(records.map(r => normalizeUrl(r.fields['RSS Feed URL'] || '')).filter(Boolean));
  return { names, urls, feeds };
}

// Verify a URL actually resolves — lenient: timeouts count as passing (many
// podcast sites block bots but are real).
async function verifyUrl(url) {
  try {
    const opts = {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    };
    let res = await fetch(url, { method: 'HEAD', ...opts });
    if (res.status === 405 || res.status === 403 || res.status === 406) {
      res = await fetch(url, { method: 'GET', ...opts });
    }
    return res.status !== 404 && res.status !== 410 && res.status !== 400;
  } catch {
    return true;
  }
}

async function callWebSearch(prompt) {
  const aiRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a dental industry researcher. You MUST respond with ONLY a valid JSON array. No markdown, no code fences, no explanation — just the raw JSON array starting with [ and ending with ].',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!aiRes.ok) throw new Error(`Perplexity error: ${await aiRes.text()}`);
  const aiData = await aiRes.json();
  const raw = aiData.choices?.[0]?.message?.content?.trim() || '';
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/\[\d+\]/g, '')
    .trim();

  let found = [];
  try { found = JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) { try { found = JSON.parse(m[0]); } catch {} } }
  return Array.isArray(found) ? found : [];
}

function buildPrompt(sub, existingNames) {
  const noun = typeNoun(sub.type);
  const exclusionNote = existingNames.size
    ? `\n\nDo NOT include any of these — they are already in our database:\n${[...existingNames].slice(0, 80).join(', ')}`
    : '';
  return `You are a dental industry researcher. Search the web to find up to ${TARGET_PER_SUBCATEGORY} high-quality, currently active ${noun} for dental professionals in this niche: "${sub.label}" (${sub.query}).

STRICT RULES — violating these makes the result useless:
- Only the ACTUAL resource itself (the ${noun.replace(/s$/, '')} / its own page) — NOT directories, listing sites, or aggregators.
- NEVER link to: Feedspot, Podchaser, Listen Notes, Chartable, Good Pods, Podcast Addict, Player FM, Rephonic, or any directory/aggregator.
- NEVER link to articles, blog posts, or review pages ABOUT a resource — link to the resource itself.
- For podcasts, use the show's own website if it has one; otherwise its Apple Podcasts or Spotify page — but NEVER list the same show twice from different platforms, and always include its RSS feed URL.
- Only include resources currently active (published content in the last 18 months).
- Stay in the niche: ${sub.label}. Do not drift into other specialties.${exclusionNote}

Return ONLY these keys per resource — do NOT include scores or category tags, those are handled separately:
- Name (string)
- URL (string — the resource's own homepage/page)
- Description (string — 1-2 sentences on what makes it valuable)
- Author (string — host / author / creator, or "" if unknown)
- RSSFeedURL (string — the podcast RSS feed URL; "" if not a podcast or unknown)
- ImageURL (string — direct URL to cover art / channel avatar / logo; "" if not found)

Return ONLY a valid JSON array of objects with exactly these keys: Name, URL, Description, Author, RSSFeedURL, ImageURL.
Aim for ${TARGET_PER_SUBCATEGORY}; it is better to return 4 real ones than pad with junk.`;
}

async function insertRecords(records) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Best-effort activity log — a failure here must never fail the actual research.
async function logRun(row) {
  try {
    await getSupabaseAdmin().from('research_runs').insert(row);
  } catch (e) {
    console.error('[research] failed to log run:', String(e.message || e));
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  // GET → return the plan (groups + their subcategory labels) so the UI knows
  // how many steps a group has before it starts looping.
  if (req.method === 'GET') {
    const groups = RESEARCH_GROUPS.map(group => ({
      group,
      subcategories: RESEARCH_PLAN[group].map(s => s.label),
    }));
    return res.status(200).json({ groups });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', ['GET', 'POST']); return res.status(405).end(); }
  if (!process.env.PERPLEXITY_API_KEY) {
    return res.status(200).json({ status: 'no_ai_key', message: 'Add PERPLEXITY_API_KEY to Vercel environment variables to enable AI research.' });
  }

  const { group, index = 0, batchId } = req.body || {};
  const plan = RESEARCH_PLAN[group];
  if (!plan) return res.status(400).json({ error: 'Unknown research group' });
  const sub = plan[index];
  if (!sub) return res.status(400).json({ error: 'index out of range' });

  const total = plan.length;
  const done = index + 1 >= total;

  try {
    const { names: existingNames, urls: existingUrls, feeds: existingFeeds } = await fetchExistingResources();

    const found = await callWebSearch(buildPrompt(sub, existingNames));

    const counts = { directories: 0, duplicates: 0, dead_links: 0, incomplete: 0 };
    const skipped = [];

    // 1. Drop directory/aggregator URLs
    const nonDirectory = found.filter(r => {
      if (isDirectoryUrl(r.URL || '')) { counts.directories++; skipped.push({ name: r.Name, url: r.URL, reason: 'directory/listing site' }); return false; }
      return true;
    });

    // 2. Dedup within this batch (name or normalized URL)
    const seenNames = new Set();
    const seenUrls = new Set();
    const batchDeduped = nonDirectory.filter(r => {
      const n = (r.Name || '').toLowerCase().trim();
      const u = normalizeUrl(r.URL || '');
      if ((n && seenNames.has(n)) || (u && seenUrls.has(u))) return false;
      seenNames.add(n); seenUrls.add(u);
      return true;
    });

    // 3. Dedup against existing DB — name, URL, or RSS feed (catches same show
    //    listed on a different platform)
    const deduped = batchDeduped.filter(r => {
      const n = (r.Name || '').toLowerCase().trim();
      const u = normalizeUrl(r.URL || '');
      const f = normalizeUrl(r.RSSFeedURL || '');
      const dup = existingNames.has(n) || existingUrls.has(u) || (f && existingFeeds.has(f));
      if (dup) { counts.duplicates++; skipped.push({ name: r.Name, reason: 'already in database' }); }
      return !dup;
    });

    // 4. Verify each URL resolves
    const verified = await Promise.all(deduped.map(async r => ({ ...r, _urlOk: r.URL ? await verifyUrl(r.URL) : false })));
    const resolving = verified.filter(r => {
      if (!r._urlOk) { counts.dead_links++; skipped.push({ name: r.Name, url: r.URL, reason: 'URL did not resolve' }); }
      return r._urlOk;
    });

    // 5. Completeness gate — only queue resources with every required field.
    //    Podcasts additionally require an RSS feed (that's what lets the
    //    harvester ingest and the episode tagger tag them after approval).
    const complete = resolving.filter(r => {
      const hasCore = (r.Name || '').trim() && (r.URL || '').trim() && (r.Description || '').trim();
      const hasFeed = sub.type !== 'Podcast' || (r.RSSFeedURL || '').trim();
      if (!hasCore || !hasFeed) {
        counts.incomplete++;
        skipped.push({ name: r.Name || '(no name)', reason: hasCore ? 'podcast missing RSS feed' : 'missing required fields' });
        return false;
      }
      return true;
    });

    // 6. Insert — Type + Specialty come from the niche (not the AI); no scores, no tags.
    const records = complete.map(r => ({
      fields: {
        Name: r.Name.trim(),
        URL: r.URL.trim(),
        Description: r.Description.trim(),
        Type: sub.type,
        Specialty: [sub.specialty],
        ...(r.Author     && r.Author.trim()     ? { 'Host or Author': r.Author.trim() } : {}),
        ...(r.RSSFeedURL && r.RSSFeedURL.trim() ? { 'RSS Feed URL':   r.RSSFeedURL.trim() } : {}),
        ...(r.ImageURL   && r.ImageURL.trim()   ? { 'Image URL':      r.ImageURL.trim() } : {}),
        Source: 'AI Agent',
        'Submission Status': 'Pending',
      },
    }));

    const chunks = [];
    for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));
    for (const chunk of chunks) await insertRecords(chunk);

    const added = complete.map(r => ({ Name: r.Name, URL: r.URL, Description: r.Description, Type: sub.type, hasRss: !!(r.RSSFeedURL || '').trim() }));

    await logRun({
      batch_id: batchId || null,
      research_group: group,
      subcategory: sub.label,
      added: added.length,
      duplicates: counts.duplicates,
      dead_links: counts.dead_links,
      directories: counts.directories,
      sample: added.slice(0, 5),
    });

    return res.status(200).json({
      status: 'ok',
      group,
      index,
      total,
      done,
      subcategory: sub.label,
      added: added.length,
      counts,
      found: added,
      skipped,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, group, index, total, done, subcategory: sub.label });
  }
}
