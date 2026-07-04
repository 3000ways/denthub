// AI Voice crowdsourcing endpoint. A listener on the player answers "Is this an
// AI voice?" → ai / human / unsure. The write goes through the service-role
// client (voice_votes is not client-writable), gated by a Cloudflare Turnstile
// check and throttled to one vote per IP per episode per UTC day. We store only
// a salted HASH of the IP, never the raw address.
//
// Re-voting the same day updates the verdict (a listener can change their mind).
// The response returns the current per-episode tally so the player can show a
// little "X of Y listeners said AI" acknowledgement. This is a SIGNAL only —
// nothing here ever flips a public label (that stays human-gated in Airtable).

import crypto from 'crypto';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

const VALID_VERDICTS = ['ai', 'human', 'unsure'];

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

// Salted, non-reversible fingerprint of the voter's IP — same scheme as reports.
function hashIp(ip) {
  const salt = process.env.TURNSTILE_SECRET_KEY || 'denthub-voice-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ error: 'Method not allowed' }); }

  const { episodeId, verdict, turnstileToken } = req.body || {};

  if (!VALID_VERDICTS.includes(verdict)) return res.status(400).json({ error: 'Invalid verdict' });
  const epId = Number(episodeId);
  if (!Number.isInteger(epId) || epId <= 0) return res.status(400).json({ error: 'Invalid episodeId' });

  const ip = clientIp(req);
  const ok = await verifyTurnstile(turnstileToken, ip);
  if (!ok) return res.status(400).json({ error: 'Verification failed. Please try again.' });

  try {
    const admin = getSupabaseAdmin();

    // Resolve the show this episode belongs to (denormalized onto the vote so the
    // admin can tally by show without a join). Also validates the episode exists.
    const { data: ep } = await admin.from('episodes').select('id, show_resource_id').eq('id', epId).maybeSingle();
    if (!ep) return res.status(404).json({ error: 'Unknown episode' });

    const ipHash = hashIp(ip);
    const userId = null; // (kept simple; anonymous is fine — throttle is by IP hash)

    // Upsert on the daily-unique key so a listener changing their mind updates
    // their existing row rather than being rejected by the throttle.
    const { error } = await admin.from('voice_votes').upsert({
      episode_id:    epId,
      resource_id:   ep.show_resource_id || null,
      verdict,
      voter_ip_hash: ipHash,
      user_id:       userId,
      voted_on:      todayUtc(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'voter_ip_hash,episode_id,voted_on' });
    if (error) return res.status(500).json({ error: 'Could not save your vote.' });

    // Return the current per-episode tally for the acknowledgement UI.
    const { data: rows } = await admin.from('voice_votes').select('verdict').eq('episode_id', epId);
    const tally = { ai: 0, human: 0, unsure: 0 };
    for (const r of rows || []) if (tally[r.verdict] != null) tally[r.verdict] += 1;

    return res.status(200).json({ ok: true, tally });
  } catch {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
