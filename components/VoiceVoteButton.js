import { useState, useRef, useEffect } from 'react';

const FONT = "'Inter', system-ui, -apple-system, sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Public Cloudflare Turnstile site key (same one the report/submit forms use).
const TURNSTILE_SITEKEY = '0x4AAAAAADknPTUZKfiTfeQc';

// Remember, per browser, which episodes this listener already answered — so we
// show their choice back instead of re-prompting. (Server still throttles by IP.)
const LS_KEY = 'tdc_voice_votes';
function readVoted() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(LS_KEY) || '{}') || {}; } catch { return {}; }
}
function rememberVote(episodeId, verdict) {
  try {
    const all = readVoted();
    all[episodeId] = verdict;
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {}
}

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

const CHOICES = [
  { value: 'human',  label: '👤 Human',   hint: 'A real person' },
  { value: 'ai',     label: '🤖 AI voice', hint: 'Synthetic / text-to-speech' },
  { value: 'unsure', label: '🤷 Not sure', hint: null },
];

// A compact "Is this an AI voice?" control for the player. Opens a small popover
// with Human / AI / Not sure. Anonymous is fine — the vote posts to /api/voice-vote
// which verifies a Turnstile token and throttles by IP. It's a crowd SIGNAL only;
// a human confirms before anything public changes.
export function VoiceVoteButton({ episodeId, showName, compact = false }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState('idle'); // idle | submitting | done | error
  const [myVote, setMyVote] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const widgetRef = useRef(null);
  const widgetIdRef = useRef(null);
  const tokenRef = useRef('');

  // Reflect any prior vote for this episode (per browser).
  useEffect(() => {
    setMyVote(episodeId != null ? (readVoted()[episodeId] || null) : null);
    setOpen(false); setState('idle'); setErrorMsg('');
  }, [episodeId]);

  // Pre-render Turnstile when the popover opens so a token is ready by the time
  // the listener taps a choice.
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    loadTurnstile().then((ts) => {
      if (disposed || !widgetRef.current || widgetRef.current.hasChildNodes()) return;
      widgetIdRef.current = ts.render(widgetRef.current, {
        sitekey: TURNSTILE_SITEKEY,
        size: 'compact',
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

  if (episodeId == null) return null;

  async function vote(verdict) {
    if (state === 'submitting') return;
    if (!tokenRef.current) { setErrorMsg('Just a moment — verifying…'); setState('error'); return; }
    setState('submitting'); setErrorMsg('');
    try {
      const res = await fetch('/api/voice-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, verdict, turnstileToken: tokenRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not save your vote.');
        setState('error');
        try { if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current); } catch {}
        tokenRef.current = '';
        return;
      }
      rememberVote(episodeId, verdict);
      setMyVote(verdict);
      setState('done');
      setTimeout(() => setOpen(false), 1100);
    } catch {
      setErrorMsg('Could not save your vote.'); setState('error');
    }
  }

  const voted = !!myVote;
  const btnBg = voted ? '#E8F5F0' : '#f0f0f0';
  const btnBorder = voted ? GREEN : '#ccc';
  const btnColor = voted ? GREEN : '#555';

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={voted ? 'You answered — tap to change' : 'Is this an AI voice?'}
        aria-label="Is this an AI voice?"
        style={{
          background: btnBg, border: `1px solid ${btnBorder}`, borderRadius: 6,
          padding: compact ? '5px 8px' : '5px 10px', cursor: 'pointer', fontFamily: FONT,
          fontSize: 11, fontWeight: 700, color: btnColor, whiteSpace: 'nowrap', lineHeight: 1,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
        {voted ? (myVote === 'ai' ? '🤖 AI' : myVote === 'human' ? '👤 Human' : '🤷 Voted') : (compact ? '🤖?' : '🤖 AI voice?')}
      </button>

      {open && (
        <>
          {/* click-away catcher */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
          <div
            role="dialog"
            aria-label="Is this an AI voice?"
            style={{
              position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, zIndex: 10001,
              width: 232, background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`,
              boxShadow: '0 10px 34px rgba(0,0,0,0.20)', padding: 14, fontFamily: FONT,
            }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>Is this an AI voice?</div>
            <div style={{ fontSize: 11, color: '#999', lineHeight: 1.45, marginBottom: 11 }}>
              Help other dentists know what to expect{showName ? ` from ${showName}` : ''}. Your answer is anonymous.
            </div>

            {state === 'done' ? (
              <div style={{ fontSize: 12.5, color: GREEN, fontWeight: 600, padding: '6px 0 2px' }}>✓ Thanks — noted!</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CHOICES.map(c => (
                    <button key={c.value} onClick={() => vote(c.value)} disabled={state === 'submitting'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        textAlign: 'left', width: '100%', padding: '9px 11px', borderRadius: 7,
                        border: `1px solid ${myVote === c.value ? GREEN : BORDER}`,
                        background: myVote === c.value ? '#f0f7f4' : '#fff',
                        cursor: state === 'submitting' ? 'default' : 'pointer', fontFamily: FONT,
                        fontSize: 13, fontWeight: 600, color: '#222',
                      }}>
                      <span>{c.label}</span>
                      {c.hint && <span style={{ fontSize: 10, color: '#aaa', fontWeight: 400 }}>{c.hint}</span>}
                    </button>
                  ))}
                </div>

                <div ref={widgetRef} style={{ marginTop: 11, minHeight: 0, display: 'flex', justifyContent: 'center' }} />

                {state === 'error' && errorMsg && (
                  <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 8 }}>{errorMsg}</div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
