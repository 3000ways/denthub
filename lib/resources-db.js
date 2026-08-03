// ─────────────────────────────────────────────────────────────────────────────
// Shared read layer for resource + category content in Supabase — the
// replacement for Airtable reads (ROADMAP: "Migrate off Airtable → Supabase").
//
// Returns records in the exact Airtable REST shape the app has consumed since
// day one — { id, createdTime, fields: { 'Name': …, 'Final Score': …, … } } —
// so swapping an Airtable fetch for one of these helpers is a one-line change
// and no component needs to learn a new shape. Fidelity rules, matching how
// Airtable serialized records:
//   • multi-selects are arrays of choice names
//   • checkboxes appear only when true
//   • empty fields are omitted entirely (callers do `fields.X || fallback`)
//   • numerics are numbers (PostgREST returns Postgres numeric as string!)
//
// Reads here use the public anon client: RLS row policy exposes only
// status='Published', and internal/PII columns (submitter email, editor notes,
// voice note) are revoked from anon at the column level (migration 0021).
// Admin/writer code paths use the service-role client instead (Phase 3).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

const EMIT = {
  num: v => (v == null ? null : Number(v)),
  str: v => (v == null || v === '' ? null : v),
  arr: v => (Array.isArray(v) && v.length ? v : null),
  bool: v => (v ? true : null),
};

// column → [Airtable field name, kind]. Shared with the admin write layer
// (lib/resources-db-admin.js), which inverts it to map fields back to columns.
export const FIELD_MAP = [
  ['name', 'Name', 'str'],
  ['url', 'URL', 'str'],
  ['thumbnail', 'Thumbnail', 'str'],
  ['type', 'Type', 'str'],
  ['specialty', 'Specialty', 'arr'],
  ['audience', 'Audience', 'str'],
  ['description', 'Description', 'str'],
  ['host_or_author', 'Host or Author', 'str'],
  ['expert_score', 'Expert Score', 'num'],
  ['popularity_score', 'Popularity Score', 'num'],
  ['recency_score', 'Recency Score', 'num'],
  ['clinical_depth_score', 'Clinical Depth Score', 'num'],
  ['community_score', 'Community Score', 'num'],
  ['final_score', 'Final Score', 'num'],
  ['vote_count', 'Vote Count', 'num'],
  ['status', 'Status', 'str'],
  ['added_by', 'Added By', 'str'],
  ['date_added', 'Date Added', 'str'],
  ['editor_notes', 'Editor Notes', 'str'],
  ['image_url', 'Image URL', 'str'],
  ['auto_image_url', 'Auto Image URL', 'str'],
  ['rss_feed_url', 'RSS Feed URL', 'str'],
  ['tags', 'Tags', 'str'],
  ['community_pick', 'Community Pick', 'bool'],
  ['source', 'Source', 'str'],
  ['submission_status', 'Submission Status', 'str'],
  ['submitter_email', 'Submitter Email', 'str'],
  ['topic', 'Topic', 'arr'],
  ['goals_outcomes', 'Goals / Outcomes', 'arr'],
  ['career_stage', 'Career Stage', 'arr'],
  ['needs_tag_review', 'Needs Tag Review', 'bool'],
  ['editors_pick', "Editor's Pick", 'bool'],
  ['editors_pick_blurb', "Editor's Pick Blurb", 'str'],
  ['editors_pick_order', "Editor's Pick Order", 'num'],
  ['featured_section', 'FeaturedSection', 'str'],
  ['score_rationale', 'Score Rationale', 'str'],
  ['last_judged', 'Last Judged', 'str'],
  ['voice_type', 'Voice Type', 'str'],
  ['voice_status', 'Voice Status', 'str'],
  ['voice_note', 'Voice Note', 'str'],
];

export function toAirtableRecord(row) {
  const fields = {};
  for (const [col, name, kind] of FIELD_MAP) {
    if (!(col in row)) continue; // partial selects just skip absent columns
    const v = EMIT[kind](row[col]);
    if (v != null) fields[name] = v;
  }
  return { id: row.id, createdTime: row.created_at || null, fields };
}

// List published resources, Airtable-shaped, sorted by Final Score desc with
// unscored resources last (same order the site always showed). Pages through
// PostgREST's 1000-row default cap so growth never silently truncates.
export async function listPublishedResources({
  type,          // filter: resource Type (e.g. 'Podcast')
  hasRss,        // filter: only rows with a non-empty RSS Feed URL
  voiceStatus,   // filter: Voice Status (e.g. 'Confirmed')
  excludeId,     // filter: drop one record id
  ids,           // filter: only these record ids
  limit,         // cap the result count
  select = '*',  // column subset for cheap queries
  client = supabase,
} = {}) {
  const PAGE = 1000;
  let from = 0;
  let rows = [];
  for (;;) {
    let q = client
      .from('resources')
      .select(select)
      .eq('status', 'Published')
      .order('final_score', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true });
    if (type) q = q.eq('type', type);
    if (hasRss) q = q.not('rss_feed_url', 'is', null).neq('rss_feed_url', '');
    if (voiceStatus) q = q.eq('voice_status', voiceStatus);
    if (excludeId) q = q.neq('id', excludeId);
    if (ids && ids.length) q = q.in('id', ids);
    q = limit
      ? q.range(from, Math.min(from + PAGE, limit) - 1)
      : q.range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error) throw new Error(`resources: ${error.message}`);
    rows = rows.concat(data || []);
    if (!data || data.length < PAGE || (limit && rows.length >= limit)) break;
    from += PAGE;
  }
  if (limit) rows = rows.slice(0, limit);
  return rows.map(toAirtableRecord);
}

// One published resource by id, Airtable-shaped — or null (missing OR not
// Published; the anon client can't see non-Published rows at all).
export async function getPublishedResource(id, { select = '*', client = supabase } = {}) {
  const { data, error } = await client
    .from('resources')
    .select(select)
    .eq('id', id)
    .eq('status', 'Published')
    .maybeSingle();
  if (error) throw new Error(`resource ${id}: ${error.message}`);
  return data ? toAirtableRecord(data) : null;
}

// All categories in display order, Airtable-shaped.
export async function listCategories({ client = supabase } = {}) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) throw new Error(`categories: ${error.message}`);
  return (data || []).map(c => {
    const fields = { 'Category Name': c.name };
    if (c.theme) fields.Theme = c.theme;
    if (c.specialty) fields.Specialty = c.specialty;
    if (c.display_order != null) fields['Display Order'] = c.display_order;
    if (c.visible) fields.Visible = true;
    return { id: `cat-${c.name}`, fields };
  });
}
