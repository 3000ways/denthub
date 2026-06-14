import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

const FONT = "'Inter', sans-serif";
const GREEN = '#2D6A4F';
const BORDER = '#e5e7eb';

const ROLES = ['Dentist', 'Specialist', 'Dental Student', 'Dental Staff', 'Other'];
const SPECIALTIES = ['General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics', 'Oral Surgery', 'Prosthodontics', 'Pediatric Dentistry', 'Oral Radiology', 'Dental Anesthesiology', 'Pain'];

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 32, width: '100%', maxWidth: 420, fontFamily: FONT }}>
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
          Sign in to vote on resources and leave comments for the dental community.
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

export function OnboardingModal({ onClose }) {
  const { updateProfile } = useAuth();
  const [role, setRole] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!role) return;
    setSaving(true);
    await updateProfile({ role, specialty: specialty || null });
    onClose();
  }

  return (
    <Overlay onClose={() => {}}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 6 }}>Welcome! One quick question</div>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>This helps us show you the most relevant resources.</div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>What best describes you?</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {ROLES.map(r => (
          <button key={r} onClick={() => setRole(r)} style={{
            fontSize: 13, padding: '7px 16px', borderRadius: 20,
            border: `1px solid ${role === r ? GREEN : BORDER}`,
            background: role === r ? GREEN : '#fff',
            color: role === r ? '#fff' : '#555',
            cursor: 'pointer', fontFamily: FONT, fontWeight: role === r ? 600 : 400,
          }}>{r}</button>
        ))}
      </div>

      {(role === 'Dentist' || role === 'Specialist') && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>Your specialty</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {SPECIALTIES.map(s => (
              <button key={s} onClick={() => setSpecialty(s)} style={{
                fontSize: 12, padding: '5px 12px', borderRadius: 20,
                border: `1px solid ${specialty === s ? GREEN : BORDER}`,
                background: specialty === s ? GREEN : '#fff',
                color: specialty === s ? '#fff' : '#555',
                cursor: 'pointer', fontFamily: FONT, fontWeight: specialty === s ? 600 : 400,
              }}>{s}</button>
            ))}
          </div>
        </>
      )}

      <button onClick={save} disabled={!role || saving} style={{
        width: '100%', padding: '13px', borderRadius: 8, border: 'none',
        background: role ? GREEN : '#e5e7eb', color: role ? '#fff' : '#aaa',
        fontSize: 15, fontWeight: 700, cursor: role ? 'pointer' : 'default', fontFamily: FONT,
      }}>
        {saving ? 'Saving…' : 'Get started →'}
      </button>
    </Overlay>
  );
}
