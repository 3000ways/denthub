// Deletes the calling user's Supabase auth account.
// User data (listening_progress, bookmarks, profiles) is deleted client-side
// first; this route handles the auth.users deletion which requires the
// service-role key and cannot be done from the browser.

import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Get the calling user's session from the Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Verify the token and get the user id
  const browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const { data: { user }, error: authError } = await browserClient.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' });

  // Delete the auth user using the admin client
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
