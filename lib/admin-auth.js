import { serialize, parse } from 'cookie';
import crypto from 'crypto';

const COOKIE_NAME = 'tdc_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days (seconds)

// Secret used to sign the admin session cookie. Prefer a dedicated env var; fall
// back to ADMIN_PASSWORD so signing works without extra config (rotating the
// password then also invalidates existing admin sessions, which is desirable).
function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

function sign(payload) {
  return crypto.createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export function setAdminCookie(res) {
  const payload = `admin:${Date.now()}`;
  const token = `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearAdminCookie(res) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}

// Validates the cookie's HMAC signature (constant-time) AND its expiry — it no
// longer trusts the mere presence of a cookie by that name.
export function isAdminAuthenticated(req) {
  const secret = signingSecret();
  if (!secret) return false; // misconfigured deploy → fail closed

  const cookies = parse(req.headers.cookie || '');
  const raw = cookies[COOKIE_NAME];
  if (!raw || typeof raw !== 'string' || !raw.includes('.')) return false;

  const [b64, sig] = raw.split('.');
  if (!b64 || !sig) return false;

  let payload;
  try {
    payload = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  const m = /^admin:(\d+)$/.exec(payload);
  if (!m) return false;
  const issued = Number(m[1]);
  if (!Number.isFinite(issued) || Date.now() - issued > MAX_AGE * 1000) return false;

  return true;
}
