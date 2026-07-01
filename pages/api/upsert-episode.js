import { getSupabaseAdmin } from '../../lib/supabase-admin';

// Upserts a single episode into the archive and returns its Supabase ID.
// Called client-side when a user hits Play on an episode that isn't in our
// archive yet (e.g. published since the last nightly harvest).
// Uses the service-role key server-side — never exposed to the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { guid, show_resource_id, show_name, title, description, audio_url, image, published_at, duration_seconds } = req.body;

  if (!guid || !show_resource_id || !audio_url) {
    return res.status(400).json({ error: 'guid, show_resource_id, and audio_url are required' });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('episodes')
    .upsert({
      guid,
      show_resource_id,
      show_name:        show_name || null,
      title:            title || null,
      description:      description ? description.slice(0, 4000) : null,
      audio_url,
      image:            image || null,
      published_at:     published_at || null,
      duration_seconds: duration_seconds || null,
    }, { onConflict: 'show_resource_id,guid' })
    .select('id')
    .single();

  if (error) {
    console.error('[upsert-episode]', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ id: data.id });
}
