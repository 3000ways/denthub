// Emails Andrei about a just-created claim or edit proposal. Those rows are
// inserted from the browser (RLS own-insert), so the page calls this right after
// with the new row's id.
//
// Abuse-safe without auth: the row must exist, be pending, be under 15 minutes
// old, and not yet notified. owner_notified_at is flipped NULL → now() in one
// conditional UPDATE and the email is only sent if that flip hit a row — so each
// claim/proposal can trigger at most one email no matter how often this is
// called. Always answers 200 {ok} so it reveals nothing about other rows.

import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { sendOwnerAlert, oneLine, ADMIN_URL } from '../../lib/notify';

const WINDOW_MS = 15 * 60 * 1000;
const KINDS = {
  claim: { table: 'resource_claims', select: 'id, resource_id, contact_email, claimant_name, claimant_role, message' },
  edit:  { table: 'resource_edit_proposals', select: 'id, resource_id, changes' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { kind, id } = req.body || {};
  const spec = KINDS[kind];
  const rowId = Number(id);
  if (!spec || !Number.isInteger(rowId) || rowId <= 0) return res.status(400).json({ error: 'Bad request' });

  try {
    const db = getSupabaseAdmin();
    const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data } = await db.from(spec.table)
      .update({ owner_notified_at: new Date().toISOString() })
      .eq('id', rowId).eq('status', 'pending').is('owner_notified_at', null).gte('created_at', cutoff)
      .select(spec.select);
    const row = data && data[0];
    if (!row) return res.status(200).json({ ok: true });

    const { data: r } = await db.from('resources').select('name').eq('id', row.resource_id).maybeSingle();
    const resourceName = oneLine(r?.name || row.resource_id);

    if (kind === 'claim') {
      await sendOwnerAlert({
        subject: `New profile claim: ${resourceName}`,
        text: [
          `Someone wants to claim "${resourceName}" on The Dental Commute.`,
          '',
          `Name:    ${oneLine(row.claimant_name) || '(not given)'}`,
          `Role:    ${oneLine(row.claimant_role) || '(not given)'}`,
          `Email:   ${oneLine(row.contact_email)}`,
          `Message: ${oneLine(row.message, 1000) || '(none)'}`,
          '',
          `Review it in Admin → Claims: ${ADMIN_URL}`,
        ].join('\n'),
      });
    } else {
      const fields = Object.keys(row.changes || {}).map(k => oneLine(k, 40));
      await sendOwnerAlert({
        subject: `Edit proposed for ${resourceName}`,
        text: [
          `The owner of "${resourceName}" proposed changes to: ${fields.join(', ') || '(no fields)'}.`,
          '',
          `Review and apply them in Admin → Claims: ${ADMIN_URL}`,
        ].join('\n'),
      });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true }); // never surface alert problems to the visitor
  }
}
