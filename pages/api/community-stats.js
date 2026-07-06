// Aggregate community signals for a resource — powers the social-proof header in
// the Community section (helpful/saves/pins counts + the specialty mix of the
// people engaging). Runs through the service-role client because bookmarks and
// profiles are private (own-read RLS): only AGGREGATES leave this endpoint —
// plain counts and up to three specialty labels, never any user identity.

import { getSupabaseAdmin } from '../../lib/supabase-admin';

export default async function handler(req, res) {
  const resourceId = req.query.resourceId;
  if (!resourceId) return res.status(400).json({ error: 'Missing resourceId' });

  try {
    const admin = getSupabaseAdmin();
    const countFor = (table) =>
      admin.from(table).select('id', { count: 'exact', head: true }).eq('resource_id', resourceId).then(r => r.count || 0);

    // Counts (cheap head queries) + the engaged users, in parallel.
    const [helpful, bookmarks, pins, comments, voteRows, bmRows, cmRows] = await Promise.all([
      countFor('votes'),
      countFor('bookmarks'),
      countFor('pins'),
      countFor('comments'),
      admin.from('votes').select('user_id').eq('resource_id', resourceId),
      admin.from('bookmarks').select('user_id').eq('resource_id', resourceId),
      admin.from('comments').select('user_id').eq('resource_id', resourceId),
    ]);

    // "Popular with": the specialties of everyone who voted/saved/commented.
    // Only specialties shared by 2+ people surface, so it reads as a real pattern
    // (and never fingerprints a lone user by a rare specialty).
    const userIds = [...new Set(
      [...(voteRows.data || []), ...(bmRows.data || []), ...(cmRows.data || [])]
        .map(r => r.user_id).filter(Boolean)
    )];

    let popularWith = [];
    if (userIds.length) {
      const { data: profs } = await admin.from('profiles').select('specialty').in('id', userIds);
      const tally = {};
      for (const p of profs || []) {
        if (p.specialty) tally[p.specialty] = (tally[p.specialty] || 0) + 1;
      }
      popularWith = Object.entries(tally)
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);
    }

    // Aggregate, non-personal — safe to cache at the edge for a couple minutes.
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ helpful, bookmarks, pins, comments, popularWith });
  } catch (err) {
    return res.status(200).json({ error: String(err.message || err) });
  }
}
