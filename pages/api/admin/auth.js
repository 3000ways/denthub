import { setAdminCookie, clearAdminCookie } from '../../../lib/admin-auth';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
      setAdminCookie(res);
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ error: 'Wrong password' });
  }

  if (req.method === 'DELETE') {
    clearAdminCookie(res);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
