import { useState, useRef, useEffect } from 'react';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Public Cloudflare Turnstile site key (same one the Submit form uses). The
// matching secret lives server-side as TURNSTILE_SECRET_KEY.
const TURNSTILE_SITEKEY = '0x4AAAAAADknPTUZKfiTfeQc';

const REASONS = [
  { value: 'broken',        label: 'Broken link or feed' },
  { value: 'ai_voice',      label: 'Sounds AI-generated' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'irrelevant',    label: 'Not relevant to dentistry' },
  { value: 'offensive',     label: 'Offensive' },
  { value: 'other',         label: 'Something else' },
];

// Ensure the Turnstile script is present, then resolve once window.turnstile is
// ready. Mirrors the loader used by the Submit form.
function loadTurnstile() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector('script[data-turnstile]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.defer = true; s.setAttribute('data-turnstile', '1');
      document.head.appendChild(s);
    }
    const t = setInterval(() => {
      if (window.turnstile) { clearInterval(t); resolve(window.turnstile); }
    }, 120);
  });
}

// "⚑ Report" — a deliberately quiet control (a text link, not a button) that
// lets any visitor flag a resource or a single episode as broken, inappropriate,
// irrelevant, offensive, or other. Anonymous is fine: the write goes through
// /api/report, which verifies a Turnstile token and throttles by IP. Pass either
// resourceId (a whole podcast/channel/book) or episodeId (one episode).
export function ReportButton({ resourceId, episodeId, name }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const widgetRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenRef = useRef('');

  // Render the Turnstile widget when the modal opens; clean it up on close.
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    loadTurnstile().then((ts) => {
      if (disposed || !widgetRef.current || widgetRef.current.hasChildNodes()) return;
      widgetIdRef.current = ts.render(widgetRef.current, {
        sitekey: TURNSTILE_SITEKEY,
        callback: (tok) => { tokenRef.current = tok; },
        'expired-callback': () => { tokenRef.current = ''; },
        'error-callback': () => { tokenRef.current = ''; },
      });
    });
    return () => {
      disposed = true;
      try { if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
      tokenRef.current = '';
    };
  }, [open]);

  function close() {
    setOpen(false); setReason(''); setNote(''); setState('idle'); setErrorMsg('');
  }

  async function submit() {
    if (!reason || state === 'submitting') return;
    if (!tokenRef.current) { setErrorMsg('Please complete the verification.'); setState('error'); return; }
    setState('submitting'); setErrorMsg('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(episodeId ? { episodeId } : { resourceId }),
          reason,
          note: note.trim().slice(0, 300),
          turnstileToken: tokenRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not send your report. Please try again.');
        setState('error');
        try { if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current); } catch {}
        tokenRef.current = '';
        return;
      }
      setState('done');
    } catch {
      setErrorMsg('Could not send your report. Please try again.');
      setState('error');
    }
  }

  const target = episodeId ? 'this episode' : (name || 'this resource');

  return (
    <>
      <button onClick={() => setOpen(true)} title="Report a problem"
        style={{ fontSize: 12.5, fontWeight: 500, color: '#b0a99a', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 6px' }}
        onMouseEnter={e => e.currentTarget.style.color = '#8a8478'}
        onMouseLeave={e => e.currentTarget.style.color = '#b0a99a'}>
        ⚑ Report
      </button>

      {open && (
        <div onMouseDown={close}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onMouseDown={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 12, padding: 22,
              fontFamily: FONT, boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}>

            {state === 'done' ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 6 }}>Thanks — we'll take a look</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 18 }}>
                  Your report was sent to our team. We review every flag.
                </div>
                <button onClick={close}
                  style={{ fontSize: 13, fontWeight: 600, padding: '9px 22px', borderRadius: 6, border: 'none',
                    background: GREEN, color: '#fff', cursor: 'pointer', fontFamily: FONT }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Report a problem</div>
                  <button onClick={close} aria-label="Close"
                    style={{ background: 'none', border: 'none', fontSize: 18, color: '#bbb', cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
                </div>
                <div style={{ fontSize: 12.5, color: '#999', marginBottom: 16, lineHeight: 1.5 }}>
                  What's wrong with {target}? This goes to our team for review.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 14 }}>
                  {REASONS.map(r => (
                    <label key={r.value}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 7,
                        cursor: 'pointer', fontSize: 13.5, color: '#333',
                        background: reason === r.value ? '#f5f2eb' : 'transparent' }}>
                      <input type="radio" name="report-reason" value={r.value}
                        checked={reason === r.value} onChange={() => setReason(r.value)} />
                      {r.label}
                    </label>
                  ))}
                </div>

                <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300}
                  placeholder="Add a detail (optional)"
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontFamily: FONT, resize: 'vertical',
                    minHeight: 56, padding: '9px 11px', borderRadius: 8, border: `1px solid ${BORDER}`,
                    outline: 'none', color: '#111', marginBottom: 14 }}
                  onFocus={e => e.currentTarget.style.borderColor = GREEN}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER} />

                <div ref={widgetRef} style={{ marginBottom: 14, minHeight: 65 }} />

                {state === 'error' && errorMsg && (
                  <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{errorMsg}</div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={submit} disabled={!reason || state === 'submitting'}
                    style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: '10px 14px', borderRadius: 6, border: 'none',
                      background: reason ? GREEN : '#cfcfcf', color: '#fff',
                      cursor: reason && state !== 'submitting' ? 'pointer' : 'default', fontFamily: FONT }}>
                    {state === 'submitting' ? 'Sending…' : 'Send report'}
                  </button>
                  <button onClick={close}
                    style={{ fontSize: 13, padding: '10px 14px', borderRadius: 6, border: `1px solid ${BORDER}`,
                      background: '#fff', color: '#888', cursor: 'pointer', fontFamily: FONT }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
