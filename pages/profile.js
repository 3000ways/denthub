import { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';
import { supabase } from '../lib/supabase';
import SiteNav from '../components/SiteNav';
import { QUESTION_KEYS, MAX_PICKS, fetchQuizOptions } from '../lib/onboarding';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

// ADA-recognized specialties (+ General Dentistry / Other). "Dental Student"
// is intentionally NOT here — that identity lives in Role, not Specialty.
const SPECIALTIES = [
  'General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics',
  'Oral & Maxillofacial Surgery', 'Prosthodontics', 'Pediatric Dentistry',
  'Oral Medicine', 'Oral Pathology', 'Dental Public Health', 'Dental Anesthesiology',
  'Other',
];

const ROLES = ['Dentist', 'Dental Student', 'Dental Hygienist', 'Dental Assistant', 'Practice Manager', 'Other'];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const CA_PROVINCES = [
  'Alberta','British Columbia','Manitoba','New Brunswick',
  'Newfoundland and Labrador','Northwest Territories','Nova Scotia',
  'Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon',
];

function SectionHeader({ label }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.10em', textTransform:'uppercase',
      color:'#999', paddingBottom:14, marginBottom:24, borderBottom:`1px solid ${BORDER}` }}>
      {label}
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { count: bookmarkCount } = useBookmarks();
  const router = useRouter();

  const [form, setForm] = useState({ full_name: '', specialty: '', role: '', avatar_url: '', province_state: '', career_stage: '', interests: [], focus_areas: [] });
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [listenStats, setListenStats] = useState(null);
  const [deleteStep, setDeleteStep]   = useState(0); // 0=idle, 1=confirm, 2=deleting
  const [quizOptions, setQuizOptions] = useState(null); // { career_stage, interest, working_on }

  useEffect(() => { fetchQuizOptions().then(setQuizOptions); }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('listening_progress')
      .select('completed, duration_seconds')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const completed   = data.filter(r => r.completed);
        const inProgress  = data.filter(r => !r.completed);
        const totalSeconds = completed.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
        setListenStats({
          completedCount:  completed.length,
          inProgressCount: inProgress.length,
          totalHours: Math.floor(totalSeconds / 3600),
          totalMins:  Math.floor((totalSeconds % 3600) / 60),
        });
      });
  }, [user]);

  useEffect(() => { if (!loading && !user) router.replace('/'); }, [loading, user]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:      profile.full_name      || '',
        specialty:      profile.specialty      || '',
        role:           profile.role           || '',
        avatar_url:     profile.avatar_url     || user?.user_metadata?.avatar_url || '',
        province_state: profile.province_state || '',
        career_stage:   profile.career_stage   || '',
        interests:      profile.interests      || [],
        focus_areas:    profile.focus_areas    || [],
      });
    }
  }, [profile]);

  // Shared toggle for both pick-lists (interests, working-on) — `field` is
  // whichever form key holds that list, `max` its pick cap.
  function togglePick(field, label, max) {
    setForm(f => {
      const cur = f[field] || [];
      if (cur.includes(label)) return { ...f, [field]: cur.filter(x => x !== label) };
      if (cur.length >= max) return f;
      return { ...f, [field]: [...cur, label] };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDeleteAccount() {
    setDeleteStep(2);
    try {
      // Delete all user data from Supabase, then delete the auth user via API
      await supabase.from('listening_progress').delete().eq('user_id', user.id);
      await supabase.from('bookmarks').delete().eq('user_id', user.id);
      await supabase.from('pins').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch {}
    await signOut();
    router.push('/');
  }

  if (loading || !user) return null;

  const avatarSrc = form.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.full_name || user.email)}&background=0F6E56&color=fff&size=80`;

  return (
    <>
      <Head><title>Profile — The Dental Commute</title></Head>
      <div style={{ background:'#f5f2eb', backgroundImage:'radial-gradient(#c2b89a 1px, transparent 1px)', backgroundSize:'22px 22px', minHeight:'100vh', fontFamily:FONT_BODY }}>
        <SiteNav />

        <div style={{ maxWidth:760, margin:'0 auto', padding:'40px 20px 100px' }}>

          {/* Page heading — outside the card */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#999', marginBottom:10, fontWeight:500 }}>Your Account</div>
            <h1 style={{ fontSize:34, fontWeight:700, color:'#111', lineHeight:1.1, margin:'0 0 6px', letterSpacing:-1, fontFamily:FONT_DISPLAY }}>
              Profile Settings
            </h1>
            <div style={{ fontSize:14, color:'#888' }}>{user.email}</div>
          </div>

          {/* ── Section 1: Profile ── */}
          <div style={{ background:'rgba(255,255,255,0.85)', border:`1px solid ${BORDER}`, borderRadius:12,
            boxShadow:'0 1px 6px rgba(0,0,0,0.05)', padding:'32px 32px 28px', marginBottom:16 }}>
            <SectionHeader label="Your Profile" />

            <form onSubmit={handleSave} style={{ maxWidth:520 }}>
              {/* Avatar */}
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:28 }}>
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.full_name || user.email)}&background=0F6E56&color=fff&size=80`; }}
                  style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', border:`2px solid ${BORDER}`, flexShrink:0 }}
                />
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Avatar URL</label>
                  <input type="url" placeholder="https://example.com/photo.jpg"
                    value={form.avatar_url}
                    onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                    style={inputStyle} />
                  <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>Paste a photo link, or leave blank to use your Google avatar.</div>
                </div>
              </div>

              <div style={{ marginBottom:18 }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" placeholder="Dr. Jane Smith"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  style={inputStyle} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:18 }}>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputStyle}>
                    <option value="">Select role</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Specialty</label>
                  <select value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} style={inputStyle}>
                    <option value="">Select specialty</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:28 }}>
                <label style={labelStyle}>Province / State</label>
                <select value={form.province_state} onChange={e => setForm(f => ({ ...f, province_state: e.target.value }))} style={{ ...inputStyle, maxWidth:260 }}>
                  <option value="">Select province or state</option>
                  <optgroup label="── United States ──">
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="── Canada ──">
                    {CA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Career stage — from the onboarding quiz (Q1). Options come live
                  from quiz_options (admin-editable), not a hardcoded list. */}
              <div style={{ marginBottom:28 }}>
                <label style={labelStyle}>Career stage</label>
                <select value={form.career_stage} onChange={e => setForm(f => ({ ...f, career_stage: e.target.value }))} style={{ ...inputStyle, maxWidth:260 }}>
                  <option value="">Select career stage</option>
                  {(quizOptions?.[QUESTION_KEYS.CAREER_STAGE] || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Interest + working-on — from the onboarding quiz (Q2). Drive
                  the "Recommended for you" strip on the homepage. */}
              <div style={{ marginBottom:20 }}>
                <label style={labelStyle}>Your interest <span style={{ color:'#aaa', fontWeight:400 }}>(up to {MAX_PICKS[QUESTION_KEYS.INTEREST]})</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:2 }}>
                  {(quizOptions?.[QUESTION_KEYS.INTEREST] || []).map(label => {
                    const active = (form.interests || []).includes(label);
                    const atCap = !active && (form.interests || []).length >= MAX_PICKS[QUESTION_KEYS.INTEREST];
                    return (
                      <button key={label} type="button" onClick={() => togglePick('interests', label, MAX_PICKS[QUESTION_KEYS.INTEREST])} disabled={atCap}
                        style={{ fontSize:12, padding:'6px 13px', borderRadius:20,
                          border:`1px solid ${active ? GREEN : BORDER}`,
                          background: active ? GREEN : '#fff',
                          color: active ? '#fff' : atCap ? '#bbb' : '#555',
                          cursor: atCap ? 'not-allowed' : 'pointer', fontFamily:FONT_BODY, fontWeight: active ? 600 : 400 }}>
                        {active ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom:28 }}>
                <label style={labelStyle}>What you&rsquo;re working on <span style={{ color:'#aaa', fontWeight:400 }}>(up to {MAX_PICKS[QUESTION_KEYS.WORKING_ON]})</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:2 }}>
                  {(quizOptions?.[QUESTION_KEYS.WORKING_ON] || []).map(label => {
                    const active = (form.focus_areas || []).includes(label);
                    const atCap = !active && (form.focus_areas || []).length >= MAX_PICKS[QUESTION_KEYS.WORKING_ON];
                    return (
                      <button key={label} type="button" onClick={() => togglePick('focus_areas', label, MAX_PICKS[QUESTION_KEYS.WORKING_ON])} disabled={atCap}
                        style={{ fontSize:12, padding:'6px 13px', borderRadius:20,
                          border:`1px solid ${active ? GREEN : BORDER}`,
                          background: active ? GREEN : '#fff',
                          color: active ? '#fff' : atCap ? '#bbb' : '#555',
                          cursor: atCap ? 'not-allowed' : 'pointer', fontFamily:FONT_BODY, fontWeight: active ? 600 : 400 }}>
                        {active ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <button type="submit" disabled={saving}
                  style={{ fontSize:13, padding:'10px 28px', borderRadius:6, background:GREEN, color:'#fff',
                    border:'none', cursor:saving ? 'not-allowed' : 'pointer', fontFamily:FONT_BODY,
                    fontWeight:600, opacity:saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {saved && <span style={{ fontSize:13, color:GREEN, fontWeight:500 }}>Saved ✓</span>}
              </div>
            </form>

          </div>{/* end profile card */}

          {/* ── Section 2: Listening & CE ── */}
          <div style={{ background:'rgba(255,255,255,0.85)', border:`1px solid ${BORDER}`, borderRadius:12,
            boxShadow:'0 1px 6px rgba(0,0,0,0.05)', padding:'32px 32px 28px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:20 }}>
                <SectionHeader label="Listening & CE Tracking" />
                {listenStats?.completedCount > 0 && (
                  <Link href="/my-listening" style={{ fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none', marginTop:-14 }}>View full history →</Link>
                )}
              </div>

              {listenStats && listenStats.completedCount > 0 ? (
                <div style={{ fontSize:14, color:'#555', fontFamily:FONT_BODY }}>
                  <strong style={{ color:'#111', fontWeight:700 }}>{listenStats.completedCount}</strong> episodes listened
                  {(listenStats.totalHours > 0 || listenStats.totalMins > 0) && (
                    <> · {listenStats.totalHours > 0 ? `${listenStats.totalHours}h ${listenStats.totalMins}m` : `${listenStats.totalMins}m`} total</>
                  )}
                  {listenStats.inProgressCount > 0 && <> · {listenStats.inProgressCount} in progress</>}
                </div>
              ) : (
                <div style={{ fontSize:13, color:'#aaa' }}>
                  No listening history yet.{' '}
                  <Link href="/" style={{ color:GREEN, textDecoration:'none', fontWeight:500 }}>Browse episodes →</Link>
                </div>
              )}

          </div>{/* end listening card */}

          {/* ── Section 3: Saved Resources ── */}
          <div style={{ background:'rgba(255,255,255,0.85)', border:`1px solid ${BORDER}`, borderRadius:12,
            boxShadow:'0 1px 6px rgba(0,0,0,0.05)', padding:'32px 32px 28px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:20 }}>
                <SectionHeader label="Saved Resources" />
                {bookmarkCount > 0 && (
                  <Link href="/saved" style={{ fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none', marginTop:-14 }}>View all →</Link>
                )}
              </div>

              {bookmarkCount === 0 ? (
                <div style={{ fontSize:13, color:'#aaa' }}>
                  Nothing saved yet. Tap the bookmark icon on any resource to save it here.
                </div>
              ) : (
                <div style={{ fontSize:14, color:'#555' }}>
                  <strong style={{ color:'#111', fontWeight:700 }}>{bookmarkCount}</strong> {bookmarkCount === 1 ? 'resource' : 'resources'} saved
                </div>
              )}

          </div>{/* end saved card */}

          {/* ── Footer: sign out + delete account ── */}
          <div style={{ background:'rgba(255,255,255,0.85)', border:`1px solid ${BORDER}`, borderRadius:12,
            boxShadow:'0 1px 6px rgba(0,0,0,0.05)', padding:'24px 32px',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
              <Link href="/" style={{ fontSize:13, color:'#888', textDecoration:'none' }}>← Back to directory</Link>

              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button
                  onClick={async () => { await signOut(); router.push('/'); }}
                  style={{ fontSize:13, padding:'8px 20px', borderRadius:6, background:'#fff', color:'#555',
                    border:`1px solid ${BORDER}`, cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500 }}>
                  Sign out
                </button>

                {deleteStep === 0 && (
                  <button onClick={() => setDeleteStep(1)}
                    style={{ fontSize:13, padding:'8px 20px', borderRadius:6, background:'#fff', color:'#c0392b',
                      border:'1px solid #f5c6c2', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500 }}>
                    Delete account
                  </button>
                )}

                {deleteStep === 1 && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff8f8',
                    border:'1px solid #f5c6c2', borderRadius:8, padding:'10px 16px' }}>
                    <span style={{ fontSize:12, color:'#c0392b', fontWeight:500 }}>This permanently deletes all your data. Sure?</span>
                    <button onClick={handleDeleteAccount}
                      style={{ fontSize:12, padding:'5px 14px', borderRadius:5, background:'#c0392b', color:'#fff',
                        border:'none', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:600 }}>
                      Yes, delete
                    </button>
                    <button onClick={() => setDeleteStep(0)}
                      style={{ fontSize:12, padding:'5px 12px', borderRadius:5, background:'none', color:'#888',
                        border:`1px solid ${BORDER}`, cursor:'pointer', fontFamily:FONT_BODY }}>
                      Cancel
                    </button>
                  </div>
                )}

                {deleteStep === 2 && (
                  <span style={{ fontSize:13, color:'#aaa' }}>Deleting…</span>
                )}
              </div>
          </div>{/* end footer card */}
        </div>
      </div>
      <Footer />
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
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  color: '#111',
  fontFamily: "'Inter', system-ui, sans-serif",
  boxSizing: 'border-box',
  outline: 'none',
};
