// ─────────────────────────────────────────────────────────────────────────────
// Owner alerts — emails Andrei when something needs him (a submission, a claim,
// an edit proposal, a report) plus a morning digest of anything still pending.
// The 2026-10 audit found claims sitting unanswered for 8 weeks because nothing
// told him they existed.
//
// Sent via Resend's HTTP API (no SDK dependency). SERVER-ONLY. Env (Vercel):
//   RESEND_API_KEY    required — without it every alert is a silent no-op
//   ALERT_EMAIL_TO    required — the owner's private inbox. Kept in Vercel, not
//                     in code: this repo is public. (Not the public contact
//                     address: Resend's shared sender below can only deliver
//                     to the Resend account's own email.)
//   ALERT_EMAIL_FROM  optional — defaults to Resend's shared sender, which can
//                     only deliver to the Resend account's own email (fine for
//                     owner alerts; set a verified-domain sender later if needed)
//
// sendOwnerEmail (below) is the OTHER direction: Andrei → a resource owner
// (claim approved / needs info / invite), sent from the admin Claims tab.
//   OUTREACH_EMAIL_FROM optional — defaults to "Andrei at The Dental Commute
//                     <hello@thedentalcommute.com>". Resend only delivers to
//                     outside addresses once thedentalcommute.com is verified
//                     in Resend (DNS records in Cloudflare).
//
// Never throws: an alert failing must never fail the visitor's submission.
// Plain-text bodies only, so visitor-supplied text can't inject HTML.
// ─────────────────────────────────────────────────────────────────────────────

import { CONTACT_EMAIL } from './contact';

export const ADMIN_URL = 'https://thedentalcommute.com/admin';

export async function sendOwnerAlert({ subject, text }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  if (!key) return { sent: false, reason: 'no RESEND_API_KEY' };
  if (!to) { console.error('[notify] ALERT_EMAIL_TO not set — alert not sent'); return { sent: false, reason: 'no ALERT_EMAIL_TO' }; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.ALERT_EMAIL_FROM || 'The Dental Commute <onboarding@resend.dev>',
        to: [to],
        subject: oneLine(subject).slice(0, 150),
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[notify] Resend', res.status, body.slice(0, 200));
      return { sent: false, reason: `Resend ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error('[notify] failed:', String(e?.message || e));
    return { sent: false, reason: 'network' };
  }
}

// Visitor text goes into subjects/bodies: flatten newlines and cap length.
export function oneLine(s, max = 200) {
  return String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

// Andrei → resource owner. Replies go to the public contact address (which
// forwards to Andrei), and Andrei gets a BCC copy as his "sent" record.
// Returns { sent, reason } with a readable reason so the admin sees why.
export async function sendOwnerEmail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'RESEND_API_KEY is not set in Vercel.' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.OUTREACH_EMAIL_FROM || `Andrei at The Dental Commute <${CONTACT_EMAIL}>`,
        to: [to],
        ...(process.env.ALERT_EMAIL_TO ? { bcc: [process.env.ALERT_EMAIL_TO] } : {}),
        reply_to: CONTACT_EMAIL,
        subject: oneLine(subject).slice(0, 200),
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = String(body?.message || '').slice(0, 300);
      console.error('[notify] owner email', res.status, msg);
      if (res.status === 403 || /verify|domain/i.test(msg)) {
        return { sent: false, reason: `Resend refused: ${msg || res.status}. thedentalcommute.com must be verified in Resend → Domains first.` };
      }
      return { sent: false, reason: `Resend error ${res.status}${msg ? `: ${msg}` : ''}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `Couldn't reach Resend: ${String(e?.message || e)}` };
  }
}
