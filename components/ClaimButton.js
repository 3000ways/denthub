import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
// Remembers "this person clicked Claim, then went off to sign in" across the
// Google redirect, so the claim form opens by itself when they come back.
const INTENT_KEY = 'tdc_claim_intent';
const CLAIM_EMAIL = 'hello@thedentalcommute.com';

// "Are you the creator?" claim flow. Signed-out visitors are prompted to sign
// in; signed-in visitors get a short form (name, role, contact email,
// optional note) that creates a pending resource_claims row for Andrei to
// review in the admin Claims tab. Shows the claim's current status once one
// exists (pending/approved/rejected) instead of the form.
export function ClaimButton({ resourceId, resourceName, onSignInRequired }) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [myClaim, setMyClaim] = useState(undefined); // undefined = loading, null = none
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setMyClaim(null); return; }
    let cancelled = false;
    supabase.from('resource_claims').select('id, status, created_at')
      .eq('user_id', user.id).eq('resource_id', resourceId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (!cancelled) setMyClaim(data || null); });
    return () => { cancelled = true; };
  }, [user, resourceId]);

  useEffect(() => {
    if (profile) { setName(profile.full_name || ''); setEmail(profile.email || ''); }
  }, [profile]);

  useEffect(() => {
    if (!user || myClaim !== null) return;
    try {
      if (sessionStorage.getItem(INTENT_KEY) === resourceId) {
        sessionStorage.removeItem(INTENT_KEY);
        setOpen(true);
      }
    } catch {}
  }, [user, myClaim, resourceId]);

  // Escape closes the pop-up; lock the page behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  function handleClick() {
    if (!user) {
      try { sessionStorage.setItem(INTENT_KEY, resourceId); } catch {}
      onSignInRequired?.();
      return;
    }
    setOpen(o => !o);
  }

  async function submit() {
    if (!email.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('resource_claims').insert({
      user_id: user.id, resource_id: resourceId,
      contact_email: email.trim(), claimant_name: name.trim() || null,
      claimant_role: role.trim() || null, message: message.trim() || null,
    }).select('id, status, created_at').single();
    setSubmitting(false);
    if (!error) {
      setMyClaim(data); setOpen(false);
      // Email Andrei (fire-and-forget; the endpoint sends at most once per claim).
      fetch('/api/notify-owner', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'claim', id: data.id }) }).catch(() => {});
    }
  }

  const btnStyle = {
    fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 6,
    border: `1px solid ${BORDER}`, background: '#fff', color: GREEN,
    cursor: 'pointer', fontFamily: FONT,
  };

  if (myClaim === undefined) return null; // loading — avoid a flash of the wrong state

  if (myClaim?.status === 'pending') {
    return <span style={{ ...btnStyle, cursor: 'default', color: '#8a6d3b', background: '#fcf6e6' }}>⏳ Claim pending review</span>;
  }
  if (myClaim?.status === 'approved') {
    return <Link href={`/creator/${resourceId}`} style={{ ...btnStyle, textDecoration: 'none', color: GREEN, background: '#E8F5F0' }}>✓ Manage this listing →</Link>;
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={handleClick} style={btnStyle}>
        {myClaim?.status === 'rejected' ? 'Re-submit claim' : 'Are you the creator? Claim this page'}
      </button>

      {/* A centred pop-up (not anchored to the button): the button sits at the
          very bottom of the resource page, so an attached box opened off-screen. */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
        <div role="dialog" aria-modal="true" aria-label={`Claim ${resourceName}`} onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: 400, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          background: '#fff', borderRadius: 10, textAlign: 'left',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)', padding: 22, fontFamily: FONT, boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4 }}>Claim {resourceName}</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 1.5 }}>
            An admin reviews every claim, usually within a few days. Once approved, you can edit
            the listing and add a creator bio. Want to talk to us directly? Email{' '}
            <a href={`mailto:${CLAIM_EMAIL}`} style={{ color: GREEN }}>{CLAIM_EMAIL}</a>.
          </div>

          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, marginBottom: 10, boxSizing: 'border-box' }} />

          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Your role</label>
          <input value={role} onChange={e => setRole(e.target.value)} placeholder="Host, producer, team member…"
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, marginBottom: 10, boxSizing: 'border-box' }} />

          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Contact email *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@yourpodcast.com"
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, marginBottom: 10, boxSizing: 'border-box' }} />

          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Note (optional)</label>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 500))} placeholder="Anything that helps us verify this is you…"
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, marginBottom: 14, minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={submitting || !email.trim()} style={{
              flex: 1, fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 6,
              border: 'none', background: GREEN, color: '#fff',
              cursor: submitting ? 'default' : 'pointer', fontFamily: FONT, opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? 'Submitting…' : 'Submit claim'}
            </button>
            <button onClick={() => setOpen(false)} style={{
              fontSize: 13, padding: '9px 14px', borderRadius: 6, border: `1px solid ${BORDER}`,
              background: '#fff', color: '#888', cursor: 'pointer', fontFamily: FONT,
            }}>
              Cancel
            </button>
          </div>
        </div>
        </div>
      )}
    </span>
  );
}
