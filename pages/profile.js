import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';
import { supabase } from '../lib/supabase';
import SiteNav from '../components/SiteNav';
import { OnboardingModal } from '../components/AuthModal';
import { CAREER_STAGES, FOCUS_OPTIONS, MAX_FOCUS } from '../lib/onboarding';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

const SPECIALTIES = [
  'General Dentistry', 'Endodontics', 'Orthodontics', 'Periodontics',
  'Oral & Maxillofacial Surgery', 'Prosthodontics', 'Pediatric Dentistry',
  'Oral Medicine', 'Oral Pathology', 'Dental Public Health', 'Dental Anesthesiology',
  'Dental Student', 'Other',
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

function getDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch { return null; } }

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
  const { bookmarkIds, count: bookmarkCount } = useBookmarks();
  const router = useRouter();

  const [form, setForm] = useState({ full_name: '', specialty: '', role: '', avatar_url: '', province_state: '', career_stage: '', focus_areas: [] });
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [savedResources, setSavedResources] = useState([]);
  const [listenStats, setListenStats] = useState(null);
  const [deleteStep, setDeleteStep]   = useState(0); // 0=idle, 1=confirm, 2=deleting
  const [showQuiz, setShowQuiz]       = useState(false); // retake the onboarding quiz

  useEffect(() => {
    if (!user) return;
    fetch('/api/airtable?table=Resources')
      .then(r => r.json())
      .then(res => setSavedResources(res.records || []))
      .catch(() => setSavedResources([]));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('listening_progress')
      .select(`completed, position_seconds, duration_seconds, completed_at, listened_at, episodes ( id, title, show_name, image )`)
      .eq('user_id', user.id)
      .order('listened_at', { ascending: false })
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
          recent: completed.slice(0, 3),
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
        focus_areas:    profile.focus_areas    || [],
      });
    }
  }, [profile]);

  function toggleFocus(label) {
    setForm(f => {
      const cur = f.focus_areas || [];
      if (cur.includes(label)) return { ...f, focus_areas: cur.filter(x => x !== label) };
      if (cur.length >= MAX_FOCUS) return f;
      return { ...f, focus_areas: [...cur, label] };
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

              {/* Career stage — from the onboarding quiz (Q1) */}
              <div style={{ marginBottom:28 }}>
                <label style={labelStyle}>Career stage</label>
                <select value={form.career_stage} onChange={e => setForm(f => ({ ...f, career_stage: e.target.value }))} style={{ ...inputStyle, maxWidth:260 }}>
                  <option value="">Select career stage</option>
                  {CAREER_STAGES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Focus areas — from the onboarding quiz (Q3). Drives the
                  "Recommended for you" strip on the homepage. */}
              <div style={{ marginBottom:28 }}>
                <label style={labelStyle}>What you&rsquo;re focused on <span style={{ color:'#aaa', fontWeight:400 }}>(up to {MAX_FOCUS} — powers your recommendations)</span></label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:2 }}>
                  {FOCUS_OPTIONS.map(o => {
                    const active = (form.focus_areas || []).includes(o.label);
                    const atCap = !active && (form.focus_areas || []).length >= MAX_FOCUS;
                    return (
                      <button key={o.label} type="button" onClick={() => toggleFocus(o.label)} disabled={atCap}
                        style={{ fontSize:12, padding:'6px 13px', borderRadius:20,
                          border:`1px solid ${active ? GREEN : BORDER}`,
                          background: active ? GREEN : '#fff',
                          color: active ? '#fff' : atCap ? '#bbb' : '#555',
                          cursor: atCap ? 'not-allowed' : 'pointer', fontFamily:FONT_BODY, fontWeight: active ? 600 : 400 }}>
                        {active ? '✓ ' : ''}{o.label}
                      </button>
                    );
                  })}
                </div>
                {/* Re-opens the onboarding quiz pre-filled with current answers —
                    a guided alternative to editing the fields above directly. */}
                <button type="button" onClick={() => setShowQuiz(true)}
                  style={{ fontSize:12, color:GREEN, fontWeight:500, background:'none', border:'none',
                    cursor:'pointer', fontFamily:FONT_BODY, padding:0, marginTop:10 }}>
                  Retake the welcome quiz →
                </button>
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
                <>
                  <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
                    <div style={{ background:'#E8F5F0', borderRadius:8, padding:'14px 20px', minWidth:100, flex:1 }}>
                      <div style={{ fontSize:24, fontWeight:700, color:GREEN, fontFamily:FONT_DISPLAY, lineHeight:1 }}>{listenStats.completedCount}</div>
                      <div style={{ fontSize:11, color:'#555', marginTop:4 }}>Episodes listened</div>
                    </div>
                    {(listenStats.totalHours > 0 || listenStats.totalMins > 0) && (
                      <div style={{ background:'#f9f9f9', borderRadius:8, padding:'14px 20px', minWidth:100, flex:1 }}>
                        <div style={{ fontSize:24, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>
                          {listenStats.totalHours > 0 ? `${listenStats.totalHours}h ${listenStats.totalMins}m` : `${listenStats.totalMins}m`}
                        </div>
                        <div style={{ fontSize:11, color:'#555', marginTop:4 }}>Total time listened</div>
                      </div>
                    )}
                    {listenStats.inProgressCount > 0 && (
                      <div style={{ background:'#f9f9f9', borderRadius:8, padding:'14px 20px', minWidth:100, flex:1 }}>
                        <div style={{ fontSize:24, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>{listenStats.inProgressCount}</div>
                        <div style={{ fontSize:11, color:'#555', marginTop:4 }}>In progress</div>
                      </div>
                    )}
                  </div>

                  {listenStats.recent.length > 0 && (
                    <div style={{ borderTop:`1px solid ${BORDER}` }}>
                      <div style={{ fontSize:11, color:'#aaa', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px 0 10px' }}>Recently listened</div>
                      {listenStats.recent.map((row, i) => {
                        const ep = row.episodes;
                        if (!ep) return null;
                        const date = row.completed_at ? new Date(row.completed_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
                        return (
                          <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 0', borderBottom:`0.5px solid ${BORDER}` }}>
                            {ep.image
                              ? <img src={ep.image} alt={ep.title} style={{ width:36, height:36, borderRadius:5, objectFit:'cover', flexShrink:0 }} />
                              : <div style={{ width:36, height:36, borderRadius:5, background:'#f0ede8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🎙</div>
                            }
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#111', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{ep.title}</div>
                              <div style={{ fontSize:11, color:'#888' }}>{ep.show_name}{date ? ` · ${date}` : ''}</div>
                            </div>
                            <span style={{ fontSize:10, color:GREEN, fontWeight:600, background:'#E8F5F0', borderRadius:4, padding:'2px 7px', flexShrink:0 }}>✓</span>
                          </div>
                        );
                      })}
                      <Link href="/my-listening" style={{ display:'block', fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none', padding:'14px 0 2px' }}>
                        View full history & CE log →
                      </Link>
                    </div>
                  )}
                </>
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
                <SectionHeader label={`Saved Resources${bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}`} />
                {bookmarkCount > 0 && (
                  <Link href="/saved" style={{ fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none', marginTop:-14 }}>View all →</Link>
                )}
              </div>

              {bookmarkCount === 0 ? (
                <div style={{ fontSize:13, color:'#aaa' }}>
                  Nothing saved yet. Tap the bookmark icon on any resource to save it here.
                </div>
              ) : (
                <div style={{ borderTop:`1px solid ${BORDER}` }}>
                  {savedResources.filter(r => bookmarkIds.has(r.id)).slice(0, 5).map(r => {
                    const f = r.fields;
                    const domain = getDomain(f.URL);
                    const logo = f['Image URL'] || (domain ? `/api/airtable?logo=${domain}` : null);
                    return (
                      <Link key={r.id} href={`/resource/${r.id}`}
                        style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:`0.5px solid ${BORDER}`, textDecoration:'none', color:'inherit' }}>
                        {logo
                          ? <img src={logo} alt={f.Name} style={{ width:34, height:34, borderRadius:6, objectFit:'contain', background:'#fafafa', border:`0.5px solid ${BORDER}`, flexShrink:0 }} />
                          : <div style={{ width:34, height:34, borderRadius:6, background:'#E8F5F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:GREEN, flexShrink:0 }}>{(f.Name||'?')[0]}</div>
                        }
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.Name}</div>
                          <div style={{ fontSize:11, color:GREEN, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.Type}</div>
                        </div>
                      </Link>
                    );
                  })}
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
      <div style={{ borderTop:'1px solid #e8e8e8', marginTop:40 }}>
        <div style={{ maxWidth:1140, margin:'0 auto', padding:'20px 28px' }}>
          <div style={{ fontSize:12, color:'#bbb' }}>© {new Date().getFullYear()} The Dental Commute. All rights reserved.</div>
        </div>
      </div>
      {/* Retake quiz — mounts fresh each open, pre-filled from the profile.
          Saving inside the quiz refreshes the auth context, which re-syncs the
          form fields above automatically. */}
      {showQuiz && <OnboardingModal onClose={() => setShowQuiz(false)} />}
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
