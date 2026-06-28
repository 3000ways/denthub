import { createClient } from '@supabase/supabase-js';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel environment variables.' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // Fetch all auth users (includes email, created_at, last_sign_in_at)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authError) throw authError;

    // Fetch all profiles (name, specialty, role)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, specialty, role, avatar_url');
    if (profilesError) throw profilesError;

    // Fetch all bookmarks to count per user
    const { data: bookmarks, error: bookmarksError } = await supabase
      .from('bookmarks')
      .select('user_id, resource_id');
    if (bookmarksError) throw bookmarksError;

    // Build lookup maps
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const bookmarkCountMap = {};
    (bookmarks || []).forEach(b => {
      bookmarkCountMap[b.user_id] = (bookmarkCountMap[b.user_id] || 0) + 1;
    });

    // Merge into one record per user
    const users = (authData?.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      provider: u.app_metadata?.provider || 'unknown',
      full_name: profileMap[u.id]?.full_name || null,
      specialty: profileMap[u.id]?.specialty || null,
      role: profileMap[u.id]?.role || null,
      avatar_url: profileMap[u.id]?.avatar_url || null,
      bookmark_count: bookmarkCountMap[u.id] || 0,
    }));

    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
}
