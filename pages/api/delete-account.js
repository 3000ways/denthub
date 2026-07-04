// Deletes the calling user's account and ALL of their data.
//
// Deleting the auth user cascades to the tables that reference auth.users /
// profiles, but we ALSO delete the user's rows explicitly (service role, child
// tables first) so deletion is complete and verifiable even if a foreign key is
// ever missing its ON DELETE CASCADE. Every step is checked; the client is told
// if anything failed instead of assuming success.

import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

// Child tables first so FK dependencies clear cleanly. Each entry: [table, column].
const USER_TABLES = [
  ['comment_upvotes', 'user_id'],
  ['comments', 'user_id'],
  ['votes', 'user_id'],
  ['bookmarks', 'user_id'],
  ['episode_bookmarks', 'user_id'],
  ['listening_progress', 'user_id'],
  ['pins', 'user_id'],
  ['resource_edit_proposals', 'user_id'],
  ['resource_owner_content', 'user_id'],
  ['resource_claims', 'user_id'],
];

// A table that simply doesn't exist in this project is not a failure to delete.
function isMissingTable(err) {
  const m = `${err?.message || ''} ${err?.code || ''}`.toLowerCase();
  return m.includes('does not exist') || m.includes('schema cache') || err?.code === '42P01';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Verify the token and get the user id.
  const browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authError } = await browserClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

  const admin = getSupabaseAdmin();

  // Explicitly clear the user's rows (checked). Tolerate tables that don't exist.
  for (const [table, col] of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq(col, user.id);
    if (error && !isMissingTable(error)) {
      return res.status(500).json({ error: `Failed to delete ${table}: ${error.message}` });
    }
  }

  // profiles keys on id (= auth user id).
  {
    const { error } = await admin.from('profiles').delete().eq('id', user.id);
    if (error && !isMissingTable(error)) {
      return res.status(500).json({ error: `Failed to delete profile: ${error.message}` });
    }
  }

  // Finally the auth user itself.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
