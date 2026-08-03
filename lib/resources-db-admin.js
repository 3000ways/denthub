// ─────────────────────────────────────────────────────────────────────────────
// Admin/write layer for resource content in Supabase — the replacement for
// Airtable writes (Phase 3 of the migration; read layer in lib/resources-db.js).
//
// SERVER-ONLY: uses the service-role key, which bypasses RLS. Import from API
// routes and lib/ code only — never from anything a page bundles client-side
// (that's why this lives in its own file rather than resources-db.js).
//
// Accepts and returns Airtable-shaped data ({ id, fields: { 'Name': … } }) so
// converted call sites keep their exact old semantics:
//   • update touches only the provided fields; explicit null clears a field
//   • unknown field names are ignored (Airtable's typecast tolerance)
//   • 'Final Score' is silently dropped — it's a generated column, never written
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase-admin';
import { toAirtableRecord, FIELD_MAP } from './resources-db';

const BY_FIELD_NAME = Object.fromEntries(FIELD_MAP.map(([col, name, kind]) => [name, { col, kind }]));

const COERCE = {
  num: v => (v == null || v === '' ? null : Number(v)),
  str: v => (v == null || v === '' ? null : String(v)),
  bool: v => !!v,
  arr: v => Array.isArray(v)
    ? v.map(s => String(s).trim()).filter(Boolean)
    : (v == null || v === '' ? [] : String(v).split(',').map(s => s.trim()).filter(Boolean)),
};

// Airtable-style fields object → resources row (only the mentioned columns).
export function rowFromFields(fields = {}) {
  const row = {};
  for (const [name, value] of Object.entries(fields)) {
    if (name === 'Final Score') continue; // generated column
    const spec = BY_FIELD_NAME[name];
    if (!spec) continue; // tolerate unknown fields, like Airtable typecast did
    row[spec.col] = COERCE[spec.kind](value);
  }
  return row;
}

// New ids keep Airtable's rec-id format (the table CHECK enforces it, and every
// per-user table — bookmarks/pins/votes/claims — stores ids in this shape).
export function newRecordId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (const byte of crypto.randomBytes(14)) s += alphabet[byte % alphabet.length];
  return 'rec' + s;
}

export function getAdminClient() {
  return getSupabaseAdmin();
}

// List resources with no RLS restriction (all statuses, all columns).
// hasRss: true → only rows with a feed URL; false → only rows without one.
export async function adminListResources({
  status,
  submissionStatus,
  type,
  hasRss,
  ids,
  select = '*',
} = {}) {
  const db = getSupabaseAdmin();
  const PAGE = 1000;
  let from = 0;
  let rows = [];
  for (;;) {
    let q = db.from('resources').select(select)
      .order('final_score', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true });
    if (status) q = q.eq('status', status);
    if (submissionStatus) q = q.eq('submission_status', submissionStatus);
    if (type) q = q.eq('type', type);
    if (hasRss === true) q = q.not('rss_feed_url', 'is', null).neq('rss_feed_url', '');
    if (hasRss === false) q = q.or('rss_feed_url.is.null,rss_feed_url.eq.');
    if (ids && ids.length) q = q.in('id', ids);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(`resources: ${error.message}`);
    rows = rows.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return rows.map(toAirtableRecord);
}

// One resource by id, any status — or null if missing.
export async function adminGetResource(id, { select = '*' } = {}) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('resources').select(select).eq('id', id).maybeSingle();
  if (error) throw new Error(`resource ${id}: ${error.message}`);
  return data ? toAirtableRecord(data) : null;
}

// Patch one resource; returns the updated record, Airtable-shaped.
export async function adminUpdateResource(id, fields) {
  const db = getSupabaseAdmin();
  const row = rowFromFields(fields);
  row.updated_at = new Date().toISOString();
  const { data, error } = await db.from('resources').update(row).eq('id', id).select().maybeSingle();
  if (error) throw new Error(`update ${id}: ${error.message}`);
  if (!data) throw new Error(`update ${id}: not found`);
  return toAirtableRecord(data);
}

// Patch a batch of Airtable-style { id, fields } records (Airtable's bulk PATCH).
export async function adminUpdateResources(records) {
  const out = [];
  for (const rec of records) out.push(await adminUpdateResource(rec.id, rec.fields));
  return out;
}

// Create a resource from an Airtable-style fields object; returns the record.
export async function adminCreateResource(fields) {
  const db = getSupabaseAdmin();
  const row = rowFromFields(fields);
  row.id = newRecordId();
  row.name = row.name || '';
  const { data, error } = await db.from('resources').insert(row).select().single();
  if (error) throw new Error(`create: ${error.message}`);
  return toAirtableRecord(data);
}

export async function adminDeleteResource(id) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('resources').delete().eq('id', id);
  if (error) throw new Error(`delete ${id}: ${error.message}`);
  return { ok: true };
}
