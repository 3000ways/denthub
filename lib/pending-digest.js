// Morning digest: one email listing everything still waiting on Andrei, sent
// from the daily scoring cron. Only goes out when something a PERSON is waiting
// on is pending (claims, edit proposals, visitor submissions, open reports) —
// the AI research queue is mentioned as an FYI but never triggers it alone, so
// a quiet day means no email.

import { getSupabaseAdmin } from './supabase-admin';
import { sendOwnerAlert, ADMIN_URL } from './notify';

async function pending(db, table, apply) {
  let q = db.from(table).select('created_at', { count: 'exact' }).order('created_at', { ascending: true }).limit(1);
  q = apply(q);
  const { data, count, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return { count: count || 0, oldest: data?.[0]?.created_at || null };
}

function age(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? ' (oldest: today)' : ` (oldest: ${days} day${days === 1 ? '' : 's'} ago)`;
}

// Everything waiting on Andrei, as { count, oldest } per bucket. Shared by the
// morning digest and the admin tab badges (/api/admin/pending-counts).
export async function getPendingCounts() {
  const db = getSupabaseAdmin();
  const [claims, edits, submissions, reports, aiQueue] = await Promise.all([
    pending(db, 'resource_claims', q => q.eq('status', 'pending')),
    pending(db, 'resource_edit_proposals', q => q.eq('status', 'pending')),
    pending(db, 'resources', q => q.eq('source', 'User Submission').eq('submission_status', 'Pending')),
    pending(db, 'resource_reports', q => q.eq('status', 'open')),
    pending(db, 'resources', q => q.eq('source', 'AI Agent').eq('submission_status', 'Pending')),
  ]);
  return { claims, edits, submissions, reports, aiQueue };
}

export async function sendPendingDigest() {
  const { claims, edits, submissions, reports, aiQueue } = await getPendingCounts();

  const people = claims.count + edits.count + submissions.count + reports.count;
  if (!people) return { sent: false, reason: 'nothing pending', counts: { claims: 0, edits: 0, submissions: 0, reports: 0 } };

  const lines = [];
  if (claims.count)      lines.push(`• ${claims.count} profile claim${claims.count > 1 ? 's' : ''} to approve${age(claims.oldest)} — Admin → Claims`);
  if (edits.count)       lines.push(`• ${edits.count} creator edit proposal${edits.count > 1 ? 's' : ''}${age(edits.oldest)} — Admin → Claims`);
  if (submissions.count) lines.push(`• ${submissions.count} visitor submission${submissions.count > 1 ? 's' : ''}${age(submissions.oldest)} — Admin → Review Queue`);
  if (reports.count)     lines.push(`• ${reports.count} open report${reports.count > 1 ? 's' : ''}${age(reports.oldest)} — Admin → Reports`);

  const result = await sendOwnerAlert({
    subject: `The Dental Commute: ${people} item${people > 1 ? 's' : ''} waiting for you`,
    text: [
      'Good morning — these are waiting on you:',
      '',
      ...lines,
      ...(aiQueue.count ? ['', `(FYI: ${aiQueue.count} AI-researched resource${aiQueue.count > 1 ? 's' : ''} also waiting in the review queue.)`] : []),
      '',
      ADMIN_URL,
      '',
      'You get this email each morning only while something is pending.',
    ].join('\n'),
  });
  return { ...result, counts: { claims: claims.count, edits: edits.count, submissions: submissions.count, reports: reports.count } };
}
