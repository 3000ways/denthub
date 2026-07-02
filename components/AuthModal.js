import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { CAREER_STAGES, QUIZ_SPECIALTIES, FOCUS_OPTIONS, MAX_FOCUS } from '../lib/onboarding';

const FONT = "'Inter', sans-serif";
const GREEN = '#2D6A4F';
const BORDER = '#e5e7eb';

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 32, width: '100%', maxWidth: 460, fontFamily: FONT }}>
        {children}
      </div>
    </div>
  );
}

export function SignInModal({ onClose }) {
  const { signInWithGoogle } = useAuth();
  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🦷</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>Join The Dental Commute</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 1.5 }}>
          Sign in to save resources, follow your favorite shows, <strong style={{ color: '#111', fontWeight: 700 }}>track your CE</strong>, vote, and leave comments for the dental community.
        </div>
        <button onClick={signInWithGoogle} style={{
          width: '100%', padding: '13px 20px', borderRadius: 8, border: `1px solid ${BORDER}`,
          background: '#fff', color: '#111', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
          Continue with Google
        </button>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 20 }}>
          By signing in you agree to our terms. Your NPI status is optional and used only to display a verified badge.
        </div>
      </div>
    </Overlay>
  );
}

// Small pill button used throughout the quiz.
function Pill({ label, active, onClick, small }) {
  return (
    <button onClick={onClick} style={{
      fontSize: small ? 12 : 13, padding: small ? '6px 13px' : '8px 16px', borderRadius: 20,
      border: `1px solid ${active ? GREEN : BORDER}`,
      background: active ? GREEN : '#fff',
      color: active ? '#fff' : '#555',
      cursor: 'pointer', fontFamily: FONT, fontWeight: active ? 600 : 400, transition: 'all 0.12s',
    }}>{label}</button>
  );
}

// Three-question onboarding quiz shown once, right after a person's first
// sign-in. Answers write to the profile (career_stage, specialty, focus_areas)
// and drive the homepage "Recommended for you" strip. Skippable at any point —
// either way we stamp onboarding_completed_at so it never shows twice.
export function OnboardingModal({ onClose }) {
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState(0); // 0=career, 1=specialty, 2=focus
  // Pre-fill from the profile so a retake (from profile settings) starts from
  // the person's previous answers rather than blank.
  const [careerStage, setCareerStage] = useState(profile?.career_stage || '');
  const [specialty, setSpecialty] = useState(profile?.specialty || '');
  const [focus, setFocus] = useState(profile?.focus_areas || []); // array of focus labels
  const [saving, setSaving] = useState(false);

  const TOTAL = 3;

  function toggleFocus(label) {
    setFocus(prev => {
      if (prev.includes(label)) return prev.filter(f => f !== label);
      if (prev.length >= MAX_FOCUS) return prev; // cap at 3
      return [...prev, label];
    });
  }

  async function finish() {
    setSaving(true);
    await updateProfile({
      career_stage: careerStage || null,
      specialty: specialty || null,
      focus_areas: focus.length ? focus : null,
      onboarding_completed_at: new Date().toISOString(),
    });
    onClose();
  }

  // Skip records completion (so we don't nag again) but saves whatever was
  // answered so far — no wasted input.
  async function skip() {
    setSaving(true);
    await updateProfile({
      career_stage: careerStage || null,
      specialty: specialty || null,
      focus_areas: focus.length ? focus : null,
      onboarding_completed_at: new Date().toISOString(),
    });
    onClose();
  }

  const canNext = step === 0 ? !!careerStage : step === 1 ? !!specialty : true;
  const isLast = step === TOTAL - 1;

  return (
    <Overlay onClose={() => {}}>
      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i <= step ? GREEN : '#eceae4', transition: 'background 0.2s',
          }} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>What describes you?</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 22 }}>We&rsquo;ll tune your homepage to where you are in your career.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {CAREER_STAGES.map(c => (
              <Pill key={c} label={c} active={careerStage === c} onClick={() => setCareerStage(c)} />
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>What&rsquo;s your focus?</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 22 }}>Your specialty helps us surface the right clinical resources.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            {QUIZ_SPECIALTIES.map(s => (
              <Pill key={s.value} label={s.label} active={specialty === s.value} onClick={() => setSpecialty(s.value)} />
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6, fontFamily: "'Playfair Display', Georgia, serif" }}>What are you working on right now?</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 22 }}>Pick up to 3 &mdash; these move matching resources to the top of your homepage.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {FOCUS_OPTIONS.map(o => {
              const active = focus.includes(o.label);
              const atCap = !active && focus.length >= MAX_FOCUS;
              return (
                <button key={o.label} onClick={() => toggleFocus(o.label)} disabled={atCap} style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 20,
                  border: `1px solid ${active ? GREEN : BORDER}`,
                  background: active ? GREEN : '#fff',
                  color: active ? '#fff' : atCap ? '#bbb' : '#555',
                  cursor: atCap ? 'not-allowed' : 'pointer', fontFamily: FONT, fontWeight: active ? 600 : 400,
                  transition: 'all 0.12s',
                }}>{active ? '✓ ' : ''}{o.label}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>{focus.length}/{MAX_FOCUS} selected</div>
        </>
      )}

      {/* Footer: back / skip on the left, next / finish on the right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} disabled={saving} style={{
              fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: 0,
            }}>← Back</button>
          )}
          <button onClick={skip} disabled={saving} style={{
            fontSize: 13, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT, padding: 0,
          }}>Skip for now</button>
        </div>

        {isLast ? (
          <button onClick={finish} disabled={saving} style={{
            padding: '11px 24px', borderRadius: 8, border: 'none', background: GREEN, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: FONT, opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Saving…' : 'See my picks →'}</button>
        ) : (
          <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} style={{
            padding: '11px 24px', borderRadius: 8, border: 'none',
            background: canNext ? GREEN : '#e5e7eb', color: canNext ? '#fff' : '#aaa',
            fontSize: 15, fontWeight: 700, cursor: canNext ? 'pointer' : 'default', fontFamily: FONT,
          }}>Next →</button>
        )}
      </div>
    </Overlay>
  );
}
