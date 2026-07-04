// Report / flag endpoint. Any visitor (signed-in or anonymous) can flag a
// resource or a single episode. The write goes through the service-role client
// (the resource_reports table is not client-writable), gated by a Cloudflare
// Turnstile check and throttled to one report per IP per target per UTC day by a
// unique index. We store only a salted HASH of the IP, never the raw address.

import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

// 'ai_voice' — a listener's hunch that a show is AI-narrated. It's just a
// signal for the admin queue; a human still confirms before any public label.
const VALID_REASONS = ['broken', 'inappropriate', 'irrelevant', 'offensive', 'ai_voice', 'other'];

async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Salted, non-reversible fingerprint of the reporter's IP — enough to enforce
// the one-per-day throttle without ever storing the raw address. Salted with a
// server-only secret so the hashes aren't a rainbow-table lookup of the IP space.
function hashIp(ip) {
  const salt = process.env.TURNSTILE_SECRET_KEY || 'denthub-report-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resourceId, episodeId, reason, note, turnstileToken } = req.body || {};

  if (!VALID_REASONS.includes(reason)) return res.status(400).json({ error: 'Invalid reason' });

  // Exactly one target.
  const hasResource = typeof resourceId === 'string' && resourceId.trim().length > 0;
  const epId = Number(episodeId);
  const hasEpisode = Number.isInteger(epId) && epId > 0;
  if (hasResource === hasEpisode) return res.status(400).json({ error: 'Provide exactly one of resourceId or episodeId' });

  const ip = clientIp(req);
  const ok = await verifyTurnstile(turnstileToken, ip);
  if (!ok) return res.status(400).json({ error: 'Verification failed. Please try again.' });

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('resource_reports').insert({
      resource_id: hasResource ? resourceId.trim() : null,
      episode_id:  hasEpisode ? epId : null,
      reason,
      note: (typeof note === 'string' && note.trim()) ? note.trim().slice(0, 300) : null,
      reporter_ip_hash: hashIp(ip),
    });

    // Unique violation on (reporter_ip_hash, target_key, reported_on) → this IP
    // already flagged this target today. Treat as success (idempotent) so the
    // UI just says thanks rather than exposing the throttle.
    if (error && error.code === '23505') return res.status(200).json({ ok: true, duplicate: true });
    if (error) return res.status(500).json({ error: 'Could not save your report.' });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
