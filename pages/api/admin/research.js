import { isAdminAuthenticated } from '../../../lib/admin-auth';

const BASE_ID = 'appICV69R7tzizCDY';
const TABLE_ID = 'tblBlou0rXbImoQ75';

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

// Fetch existing Published/Pending resources for dedup — skip Rejected so they can be re-suggested
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
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch error ${res.status}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  const names = new Set(records.map(r => (r.fields.Name || '').toLowerCase().trim()));
  const urls  = new Set(records.map(r => normalizeUrl(r.fields.URL || '')));
  return { names, urls };
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

// Verify a URL actually resolves — lenient: timeouts count as passing
// (many podcast sites block bots but are real)
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
    // Accept anything that isn't a hard 404/410 — 403/429/503 usually means site exists but blocks bots
    return res.status !== 404 && res.status !== 410 && res.status !== 400;
  } catch {
    // Timeout or network error — assume real (Perplexity verified it)
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

  // Strip markdown code fences and Perplexity citation markers like [1], [2]
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/\[\d+\]/g, '')   // strip [1], [2], etc.
    .trim();

  let found = [];
  try { found = JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\[[\s\S]*\]/); if (m) { try { found = JSON.parse(m[0]); } catch {} } }
  return found;
}

async function askGPT(category, theme, existingNames, customPrompt) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return { status: 'no_ai_key', message: 'Add PERPLEXITY_API_KEY to Vercel environment variables to enable AI research.', found: [] };
  }

  const exclusionNote = existingNames.size
    ? `\n\nDo NOT include any of these — they are already in our database:\n${[...existingNames].slice(0, 80).join(', ')}`
    : '';

  const basePrompt = customPrompt || `You are a dental industry researcher. Search the web to find 10 high-quality, currently active resources in the category "${category}"${theme ? ` (theme: "${theme}")` : ''} for dental professionals.

STRICT RULES — violating these will make the result useless:
- Only include the ACTUAL resource (the podcast, YouTube channel, or website itself) — NOT directories, listing sites, or review pages about it.
- NEVER link to: Feedspot, Podchaser, Listen Notes, Chartable, Good Pods, Podcast Addict, Player FM, Rephonic, or any other podcast directory or aggregator.
- NEVER link to articles, blog posts, or review pages ABOUT a resource. Link to the resource itself.
- If a podcast has its own website, use that. If not, use its Apple Podcasts or Spotify page — but NEVER list the same podcast twice from different platforms.
- Only include resources that are currently active (published content in the last 18 months).
- Be specific: an orthodontic podcast does not belong in "Endodontic Podcasts".${exclusionNote}

For each resource, score it honestly on these 5 dimensions (0–100):
- ExpertScore: reputation among dental experts and peers
- CommunityScore: community engagement and listener sentiment
- PopularityScore: audience size and reach
- RecencyScore: how recently and actively it publishes
- ClinicalDepthScore: clinical relevance and depth for practitioners

Return ONLY a valid JSON array. Each object must have exactly these keys:
Name, URL, Description, Type, ExpertScore, CommunityScore, PopularityScore, RecencyScore, ClinicalDepthScore

Type must be one of: Podcast, YouTube, Website, Book, Course, Software, Community, Conference, Other

Find as many qualifying resources as possible — aim for 10. It is better to return 8 good results than 1 perfect one.`;

  const found = await callWebSearch(basePrompt);
  return { status: 'ok', found };
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

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { category, theme, customPrompt } = req.body;
  if (!category) return res.status(400).json({ error: 'category required' });

  try {
    // 1. Fetch existing resources for dedup
    const { names: existingNames, urls: existingUrls } = await fetchExistingResources();

    // 2. Ask Perplexity with web search
    const result = await askGPT(category, theme || '', existingNames, customPrompt);
    if (result.status === 'no_ai_key') return res.status(200).json(result);
    if (!result.found?.length) return res.status(200).json({ status: 'ok', added: 0, found: [], skipped: [] });

    // 3a. Filter out directory/listing URLs
    const nonDirectory = result.found.filter(r => {
      if (isDirectoryUrl(r.URL || '')) return false;
      return true;
    });

    // 3b. Dedup within this batch by name (catches same podcast on Apple + Spotify)
    const seenNames = new Set();
    const batchDeduped = nonDirectory.filter(r => {
      const nameLower = (r.Name || '').toLowerCase().trim();
      if (seenNames.has(nameLower)) return false;
      seenNames.add(nameLower);
      return true;
    });

    // 3c. Dedup against existing database
    const deduped = batchDeduped.filter(r => {
      const nameLower = (r.Name || '').toLowerCase().trim();
      const urlNorm = normalizeUrl(r.URL || '');
      return !existingNames.has(nameLower) && !existingUrls.has(urlNorm);
    });

    // 4. Verify each URL actually resolves (in parallel)
    const verified = await Promise.all(
      deduped.map(async r => {
        const ok = r.URL ? await verifyUrl(r.URL) : false;
        return { ...r, _urlOk: ok };
      })
    );

    const passed = verified.filter(r => r._urlOk);
    const skipped = [
      ...result.found.filter(r => isDirectoryUrl(r.URL || '')).map(r => ({ name: r.Name, url: r.URL, reason: 'directory/listing site' })),
      ...result.found.filter(r => {
        const nameLower = (r.Name || '').toLowerCase().trim();
        return existingNames.has(nameLower);
      }).map(r => ({ name: r.Name, reason: 'already in database' })),
      ...verified.filter(r => !r._urlOk).map(r => ({ name: r.Name, url: r.URL, reason: 'URL did not resolve' })),
    ];

    if (!passed.length) {
      return res.status(200).json({ status: 'ok', added: 0, found: [], skipped });
    }

    // 5. Insert verified, deduped records into Airtable as AI Agent / Pending
    const records = passed.map(({ _urlOk, ...r }) => ({
      fields: {
        Name: r.Name || '',
        URL: r.URL || '',
        Description: r.Description || '',
        Type: (r.Type || 'Website') === 'YouTube Channel' ? 'YouTube' : (r.Type || 'Website'),
        Tags: [category],
        ...(r.ExpertScore        != null ? { 'Expert Score':          Number(r.ExpertScore) }        : {}),
        ...(r.CommunityScore     != null ? { 'Community Score':       Number(r.CommunityScore) }     : {}),
        ...(r.PopularityScore    != null ? { 'Popularity Score':      Number(r.PopularityScore) }    : {}),
        ...(r.RecencyScore       != null ? { 'Recency Score':         Number(r.RecencyScore) }       : {}),
        ...(r.ClinicalDepthScore != null ? { 'Clinical Depth Score':  Number(r.ClinicalDepthScore) } : {}),
        Source: 'AI Agent',
        'Submission Status': 'Pending',
      },
    }));

    const chunks = [];
    for (let i = 0; i < records.length; i += 10) chunks.push(records.slice(i, i + 10));
    for (const chunk of chunks) await insertRecords(chunk);

    return res.status(200).json({ status: 'ok', added: passed.length, found: passed, skipped });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
