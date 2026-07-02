// AI episode tagging — replaces resource-level keyword matching with per-EPISODE
// tags. An AI reads each episode's title/description and marks which of the
// quiz's own answer options (career stage, clinical interest, "working on") it
// genuinely fits. "Recommended for You" then becomes a simple array-overlap
// query against a person's quiz answers — see recommendEpisodes in onboarding.js.
//
// Taxonomy comes from the `quiz_options` table (not a hardcoded list), so an
// admin adding/retiring a quiz option automatically changes what the tagger
// looks for next run — no code change needed.
//
// Concurrency-safe backlog processing: claim_untagged_episodes() (a Postgres
// function, see migration 0012) atomically claims a batch with
// `SELECT ... FOR UPDATE SKIP LOCKED`, so two overlapping calls (e.g. an admin
// double-click) can never grab the same rows. A row is only marked
// quiz_tagged_at (final) after its AI call succeeds; the claim marker
// (quiz_tag_claimed_at) expires after 5 minutes, so a batch that errors out
// doesn't strand its episodes — they're picked up again automatically.

import { getSupabaseAdmin } from './supabase-admin';

const AI_CHUNK_SIZE = 20; // episodes per single AI call (cuts round-trips ~20x)

// Short definitions for the ambiguous / easily-confused tags, so the model
// doesn't over- or under-apply them.
const TAG_DEFINITIONS = {
  'TMD': 'temporomandibular joint disorder — jaw joint pain, clicking, bruxism, occlusion-related dysfunction',
  'Orofacial pain': 'chronic facial, jaw, or head pain diagnosis and management — may overlap with TMD but is broader',
  'Myofunctional Therapy': 'tongue posture, orofacial muscle function, airway and breathing-related therapy (e.g. tongue-tie, mouth breathing)',
  'Pathology': 'oral lesions, biopsies, and disease diagnosis — not pain or joint-function content',
  'General practice': 'broad, not tied to a specific specialty',
};

const QUESTION_LABELS = {
  career_stage: 'CAREER STAGE (who this episode speaks to)',
  interest: 'CLINICAL INTEREST',
  working_on: 'WHAT THEY\'RE WORKING ON',
};

async function fetchTaxonomy(db) {
  const { data } = await db.from('quiz_options').select('question_key, label').eq('active', true).order('sort_order');
  const byQuestion = {};
  (data || []).forEach(o => {
    byQuestion[o.question_key] = byQuestion[o.question_key] || [];
    byQuestion[o.question_key].push(o.label);
  });
  const all = new Set((data || []).map(o => o.label));
  return { byQuestion, validLabels: all };
}

function taxonomyPromptBlock(byQuestion) {
  return Object.entries(QUESTION_LABELS)
    .filter(([key]) => byQuestion[key]?.length)
    .map(([key, heading]) => `${heading}: ${byQuestion[key].join(', ')}`)
    .join('\n');
}

function definitionsBlock(byQuestion) {
  const present = new Set(Object.values(byQuestion).flat());
  const lines = Object.entries(TAG_DEFINITIONS).filter(([label]) => present.has(label));
  if (!lines.length) return '';
  return `\nDefinitions for easily-confused tags:\n${lines.map(([label, def]) => `- ${label}: ${def}`).join('\n')}`;
}

// Tags a single batch (<= AI_CHUNK_SIZE) of episodes in one AI call. Returns an
// array of tag arrays, parallel to `episodes`, or null on failure.
async function tagChunk(episodes, taxonomy) {
  const list = episodes.map((e, i) =>
    `${i + 1}. "${e.title}" (show: ${e.show_name || 'unknown'}) — ${(e.description || '(no description)').slice(0, 300)}`
  ).join('\n');

  const prompt = `You are tagging podcast/video episodes for a dental content platform's recommendation engine.

Dentists take a short quiz and pick from these fixed tags. Your job: for each episode below, return ONLY the tags (from any of the groups) that this SPECIFIC episode is genuinely about, based on its title and description. Zero, one, or several tags per episode. Don't guess broadly — if the content doesn't clearly support a tag, leave it out.

${taxonomyPromptBlock(taxonomy.byQuestion)}
${definitionsBlock(taxonomy.byQuestion)}

Episodes:
${list}

Return ONLY a JSON array of exactly ${episodes.length} objects, in the same order, no markdown:
[{"tags": ["...", "..."]}, ...]`;

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar', // plain classification, no web search needed — cheaper/faster than sonar-pro
      messages: [
        { role: 'system', content: 'You are a precise content classifier. Respond with ONLY a valid JSON array — no markdown, no prose.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').trim();
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let arr;
  try { arr = JSON.parse(cleaned); } catch { const m = cleaned.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : null; }
  if (!Array.isArray(arr) || arr.length !== episodes.length) return null;

  // Safety: only keep tags the model was actually given — never let a
  // hallucinated label slip into the taxonomy.
  return arr.map(item => (Array.isArray(item?.tags) ? item.tags : [])
    .filter(t => taxonomy.validLabels.has(t)));
}

async function countUntagged(db) {
  const { count } = await db.from('episodes').select('id', { count: 'exact', head: true }).is('quiz_tagged_at', null);
  return count || 0;
}

// Claims and tags up to `claimSize` untagged episodes. `trigger` is logged to
// tagging_runs ('backfill' from the admin button, 'harvest' from the daily
// cron tagging new episodes). Safe to call concurrently or repeatedly — see
// module docblock for the concurrency guarantees.
export async function tagUntaggedEpisodes({ claimSize = 300, trigger = 'backfill' } = {}) {
  if (!process.env.PERPLEXITY_API_KEY) return { status: 'no_ai_key', tagged: 0, remaining: 0 };
  const db = getSupabaseAdmin();

  const taxonomy = await fetchTaxonomy(db);
  if (!taxonomy.validLabels.size) return { status: 'no_taxonomy', tagged: 0, remaining: 0 };

  const { data: claimed, error: claimErr } = await db.rpc('claim_untagged_episodes', { p_batch_size: claimSize });
  if (claimErr) throw new Error(claimErr.message);
  if (!claimed || !claimed.length) {
    const remaining = await countUntagged(db);
    return { status: 'ok', tagged: 0, attempted: 0, remaining, sample: [] };
  }

  const chunks = [];
  for (let i = 0; i < claimed.length; i += AI_CHUNK_SIZE) chunks.push(claimed.slice(i, i + AI_CHUNK_SIZE));

  // Run the AI calls for this batch concurrently — wall-clock is roughly the
  // slowest single call, not the sum of all of them.
  const results = await Promise.allSettled(chunks.map(chunk => tagChunk(chunk, taxonomy)));

  const nowIso = new Date().toISOString();
  let tagged = 0;
  const sample = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const res = results[ci];
    // On failure, do nothing — these episodes stay claimed until the 5-minute
    // claim window expires, then a later batch retries them automatically.
    if (res.status !== 'fulfilled' || !res.value) continue;

    const rows = chunk.map((ep, idx) => ({ id: ep.id, quiz_tags: res.value[idx] || [], quiz_tagged_at: nowIso }));
    const { error: upErr } = await db.from('episodes').upsert(rows, { onConflict: 'id' });
    if (upErr) continue;

    tagged += rows.length;
    rows.slice(0, 3).forEach((r, idx) => sample.push({ title: chunk[idx].title, show: chunk[idx].show_name, tags: r.quiz_tags }));
  }

  const remaining = await countUntagged(db);
  const summary = { tagged, attempted: claimed.length, remaining };
  try { await db.from('tagging_runs').insert({ trigger, tagged_count: tagged, remaining_count: remaining, sample: sample.slice(0, 8) }); } catch { /* logging is best-effort */ }

  return { status: 'ok', ...summary, sample: sample.slice(0, 8) };
}

// Read-only snapshot for the admin visibility panel: coverage + the most
// recently tagged episodes (a live "what the AI is doing" sample).
export async function getTaggingStatus() {
  const db = getSupabaseAdmin();
  const [totalRes, taggedRes, lastRunRes, recentRes] = await Promise.all([
    db.from('episodes').select('id', { count: 'exact', head: true }),
    db.from('episodes').select('id', { count: 'exact', head: true }).not('quiz_tagged_at', 'is', null),
    db.from('tagging_runs').select('ran_at, trigger, tagged_count, remaining_count').order('ran_at', { ascending: false }).limit(1),
    db.from('episodes').select('title, show_name, quiz_tags, quiz_tagged_at').not('quiz_tagged_at', 'is', null).order('quiz_tagged_at', { ascending: false }).limit(6),
  ]);
  const total = totalRes.count || 0;
  const taggedCount = taggedRes.count || 0;
  return {
    total,
    tagged: taggedCount,
    remaining: Math.max(0, total - taggedCount),
    lastRun: (lastRunRes.data && lastRunRes.data[0]) || null,
    recentSample: recentRes.data || [],
  };
}
