import crypto from 'crypto';
import { setAdminCookie, clearAdminCookie } from '../../../lib/admin-auth';

// Constant-time string comparison (avoids leaking length/content via timing).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Fail closed if the password isn't configured — otherwise `undefined ===
    // undefined` would grant admin on an empty submission. (audit backend M1)
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return res.status(500).json({ error: 'Admin login is not configured' });

    const { password } = req.body || {};
    if (password && safeEqual(password, expected)) {
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
