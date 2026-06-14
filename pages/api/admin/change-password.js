import { isAdminAuthenticated } from '../../../lib/admin-auth';

const PROJECT_ID = 'prj_v5umnsV6sj1wqQKXCr5hOI2XoNfg';
const TEAM_ID    = 'team_qncUnQooroOeHbDulYfvQWLx';

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

  // Verify current password
  if (currentPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  if (!VERCEL_TOKEN) {
    return res.status(500).json({ error: 'VERCEL_TOKEN not configured — add it to Vercel environment variables to enable password changes.' });
  }

  try {
    // Find the existing ADMIN_PASSWORD env var ID
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!listRes.ok) throw new Error(`Vercel API error: ${await listRes.text()}`);
    const listData = await listRes.json();
    const envVar = listData.envs?.find(e => e.key === 'ADMIN_PASSWORD' && e.target?.includes('production'));
    if (!envVar) throw new Error('ADMIN_PASSWORD env var not found in Vercel project');

    // Update it
    const updateRes = await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${envVar.id}?teamId=${TEAM_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newPassword, type: 'encrypted', target: ['production'] }),
      }
    );
    if (!updateRes.ok) throw new Error(`Vercel update error: ${await updateRes.text()}`);

    // Trigger a redeployment so the new password takes effect
    const deployRes = await fetch(
      `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'denthub',
          gitSource: { type: 'github', repoId: null },
          projectId: PROJECT_ID,
          target: 'production',
          forceNew: 1,
        }),
      }
    );
    // Deploy trigger is best-effort — password is already updated in Vercel regardless
    const deployed = deployRes.ok;

    return res.status(200).json({
      ok: true,
      message: deployed
        ? 'Password updated. A redeployment has been triggered — the new password will be active in ~1 minute.'
        : 'Password updated in Vercel. Trigger a redeploy (push to GitHub or re-run deploy) for it to take effect.',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
