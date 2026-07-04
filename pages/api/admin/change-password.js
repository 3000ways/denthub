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

    // Update it — preserve the var's existing target scope (don't silently strip it
    // to production-only, which would drop it from preview/development envs).
    const updateRes = await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${envVar.id}?teamId=${TEAM_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newPassword, type: 'encrypted', target: envVar.target || ['production'] }),
      }
    );
    if (!updateRes.ok) throw new Error(`Vercel update error: ${await updateRes.text()}`);

    // Trigger a redeployment so the new password takes effect. The old code sent
    // `repoId: null`, which Vercel rejects with a 400 every time — so the deploy
    // never actually happened and the new password stayed dormant until an
    // unrelated push. Fetch the project's real git link (repoId + production
    // branch) and pass those instead.
    let deployed = false;
    try {
      const projRes = await fetch(
        `https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
      );
      const proj = projRes.ok ? await projRes.json() : null;
      const repoId = proj?.link?.repoId;
      const ref = proj?.link?.productionBranch || 'main';

      if (repoId) {
        const deployRes = await fetch(
          `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'denthub',
              gitSource: { type: 'github', repoId, ref },
              project: PROJECT_ID,
              target: 'production',
            }),
          }
        );
        deployed = deployRes.ok;
      }
    } catch {
      deployed = false; // best-effort — password is already updated in Vercel regardless
    }

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
