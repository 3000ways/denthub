import { serialize, parse } from 'cookie';

const COOKIE_NAME = 'tdc_admin';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setAdminCookie(res) {
  const token = Buffer.from(`tdc_admin:${Date.now()}`).toString('base64');
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

export function isAdminAuthenticated(req) {
  const cookies = parse(req.headers.cookie || '');
  return !!cookies[COOKIE_NAME];
}
