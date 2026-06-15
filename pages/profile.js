import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

const SPECIALTIES = [
  'General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics',
  'Oral & Maxillofacial Surgery', 'Prosthodontics', 'Pediatric Dentistry',
  'Oral Medicine', 'Oral Pathology', 'Dental Public Health', 'Dental Anesthesiology',
  'Dental Student', 'Other',
];

const ROLES = ['Dentist', 'Dental Student', 'Dental Hygienist', 'Dental Assistant', 'Practice Manager', 'Other'];

export default function ProfilePage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ full_name: '', specialty: '', role: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:  profile.full_name  || '',
        specialty:  profile.specialty  || '',
        role:       profile.role       || '',
        avatar_url: profile.avatar_url || user?.user_metadata?.avatar_url || '',
      });
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading || !user) return null;

  const avatarSrc = form.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.full_name || user.email)}&background=0F6E56&color=fff&size=80`;

  return (
    <>
      <Head>
        <title>Profile — The Dental Commute</title>
      </Head>
      <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>
        <div style={{ height:3, background:GREEN }} />

        <div style={{ maxWidth:720, margin:'0 auto', padding:'0 28px 100px' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 0 18px', borderBottom:`1px solid ${BORDER}`, marginBottom:60 }}>
            <Link href="/">
              <img src="/logo.png" alt="The Dental Commute" style={{ height:281, width:'auto', display:'block' }} />
            </Link>
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <Link href="/about" style={{ fontSize:13, color:'#111', textDecoration:'none', fontWeight:500 }}>About</Link>
              <Link href="/?submit=1" style={{ fontSize:12, padding:'6px 16px', borderRadius:3, background:GREEN, color:'#fff', textDecoration:'none', fontWeight:500, letterSpacing:0.2 }}>
                Submit a resource
              </Link>
            </div>
          </div>

          {/* Page title */}
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:14, fontWeight:500 }}>Your Account</div>
            <h1 style={{ fontSize:34, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 8px', letterSpacing:-1, fontFamily:FONT_DISPLAY }}>
              Profile Settings
            </h1>
            <a href={`mailto:${user.email}`} style={{ fontSize:14, color:'#888', margin:0, textDecoration:'none' }}>{user.email}</a>
          </div>

          <form onSubmit={handleSave} style={{ maxWidth:520 }}>

            {/* Avatar preview */}
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:36, paddingBottom:32, borderBottom:`1px solid ${BORDER}` }}>
              <img
                src={avatarSrc}
                alt="Avatar"
                onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.full_name || user.email)}&background=0F6E56&color=fff&size=80`; }}
                style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', border:`2px solid ${BORDER}` }}
              />
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={form.avatar_url}
                  onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  style={inputStyle}
                />
                <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>Paste a direct link to a photo, or leave blank to use your Google avatar.</div>
              </div>
            </div>

            {/* Full name */}
            <div style={{ marginBottom:22 }}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                placeholder="Dr. Jane Smith"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Role */}
            <div style={{ marginBottom:22 }}>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                <option value="">Select your role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Specialty */}
            <div style={{ marginBottom:36 }}>
              <label style={labelStyle}>Specialty</label>
              <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} style={inputStyle}>
                <option value="">Select your specialty</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Save button */}
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ fontSize:13, padding:'10px 28px', borderRadius:4, background:GREEN, color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', fontFamily:FONT_BODY, fontWeight:500, opacity:saving?0.7:1 }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span style={{ fontSize:13, color:GREEN, fontWeight:500 }}>Saved ✓</span>}
            </div>

          </form>

          {/* Back link */}
          <div style={{ marginTop:48, paddingTop:28, borderTop:`1px solid ${BORDER}` }}>
            <Link href="/" style={{ fontSize:13, color:'#888', textDecoration:'none' }}>← Back to directory</Link>
          </div>
        </div>
      </div>
    </>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  marginBottom: 6,
  letterSpacing: 0.2,
};

const inputStyle = {
  width: '100%',
  fontSize: 14,
  padding: '9px 12px',
  borderRadius: 4,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  color: '#111',
  fontFamily: "'Inter', system-ui, sans-serif",
  boxSizing: 'border-box',
  outline: 'none',
};
