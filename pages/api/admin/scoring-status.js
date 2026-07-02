// Read-only status for the admin Scoring tab: when each scoring pass last ran
// successfully, and its summary. Lets the admin check weekly whether the system
// worked without triggering a run.

import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { isAdminAuthenticated } from '../../../lib/admin-auth';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const db = getSupabaseAdmin();
    const latest = async (kind) => {
      const { data } = await db.from('scoring_runs')
        .select('ran_at, summary').eq('kind', kind)
        .order('ran_at', { ascending: false }).limit(1);
      return data && data[0] ? data[0] : null;
    };
    const [dataRun, judgeRun] = await Promise.all([latest('data'), latest('judge')]);
    return res.status(200).json({ dataRun, judgeRun });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
