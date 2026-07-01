import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';
import { supabase } from '../lib/supabase';
import SiteNav from '../components/SiteNav';

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

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, signOut } = useAuth();
  const { bookmarkIds, count: bookmarkCount } = useBookmarks();
  const router = useRouter();

  const [form, setForm] = useState({ full_name: '', specialty: '', role: '', avatar_url: '', province_state: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedResources, setSavedResources] = useState([]);
  const [listenStats, setListenStats] = useState(null);

  // Pull resource details so we can preview a few bookmarks here.
  useEffect(() => {
    if (!user) return;
    fetch('/api/airtable?table=Resources')
      .then(r => r.json())
      .then(res => setSavedResources(res.records || []))
      .catch(() => setSavedResources([]));
  }, [user]);

  // Fetch listening stats from Supabase
  useEffect(() => {
    if (!user) return;
    supabase
      .from('listening_progress')
      .select(`
        completed, position_seconds, duration_seconds, completed_at, listened_at,
        episodes ( id, title, show_name, image )
      `)
      .eq('user_id', user.id)
      .order('listened_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const completed = data.filter(r => r.completed);
        const inProgress = data.filter(r => !r.completed);
        const totalSeconds = completed.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
        setListenStats({
          completedCount: completed.length,
          inProgressCount: inProgress.length,
          totalHours: Math.floor(totalSeconds / 3600),
          totalMins: Math.floor((totalSeconds % 3600) / 60),
          recent: completed.slice(0, 3),
        });
      });
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user]);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:  profile.full_name  || '',
        specialty:      profile.specialty      || '',
        role:           profile.role           || '',
        avatar_url:     profile.avatar_url     || user?.user_metadata?.avatar_url || '',
        province_state: profile.province_state || '',
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
        <SiteNav />

        <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 28px 100px' }}>

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

            <div style={{ marginBottom:22 }}>
              <label style={labelStyle}>Province / State</label>
              <select value={form.province_state} onChange={e => setForm(f => ({ ...f, province_state: e.target.value }))} style={inputStyle}>
                <option value="">Select province or state</option>
                <optgroup label="── United States ──">
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </optgroup>
                <optgroup label="── Canada ──">
                  {CA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
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

          {/* CE / Listening */}
          <div style={{ marginTop:56, paddingTop:36, borderTop:`1px solid ${BORDER}` }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', letterSpacing:0.2 }}>Listening & CE Tracking</div>
              {listenStats?.completedCount > 0 && (
                <Link href="/my-listening" style={{ fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none' }}>View full history →</Link>
              )}
            </div>

            {/* Stats row */}
            {listenStats && listenStats.completedCount > 0 ? (
              <>
                <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
                  <div style={{ background:'#E8F5F0', borderRadius:8, padding:'14px 20px', minWidth:100, flex:1 }}>
                    <div style={{ fontSize:24, fontWeight:700, color:GREEN, fontFamily:FONT_DISPLAY, lineHeight:1 }}>
                      {listenStats.completedCount}
                    </div>
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
                      <div style={{ fontSize:24, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, lineHeight:1 }}>
                        {listenStats.inProgressCount}
                      </div>
                      <div style={{ fontSize:11, color:'#555', marginTop:4 }}>In progress</div>
                    </div>
                  )}
                </div>

                {/* Recent listens */}
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
          </div>

          {/* Saved resources */}
          <div style={{ marginTop:56, paddingTop:36, borderTop:`1px solid ${BORDER}` }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', letterSpacing:0.2 }}>
                Saved resources{bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}
              </div>
              {bookmarkCount > 0 && (
                <Link href="/saved" style={{ fontSize:12, color:GREEN, fontWeight:500, textDecoration:'none' }}>View all →</Link>
              )}
            </div>
            {bookmarkCount === 0 ? (
              <div style={{ fontSize:13, color:'#aaa' }}>
                Nothing saved yet. Tap the bookmark icon on any resource to save it here.
              </div>
            ) : (
              <div style={{ borderTop:`1px solid ${BORDER}` }}>
                {savedResources.filter(r => bookmarkIds.has(r.id)).slice(0,5).map(r => {
                  const f = r.fields;
                  const domain = getDomain(f.URL);
                  const logo = f['Image URL'] || (domain ? `/api/airtable?logo=${domain}` : null);
                  return (
                    <Link key={r.id} href={`/resource/${r.id}`}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom:`0.5px solid ${BORDER}`, textDecoration:'none', color:'inherit' }}>
                      {logo
                        ? <img src={logo} alt={f.Name} style={{ width:34, height:34, borderRadius:6, objectFit:'contain', background:'#fafafa', border:`0.5px solid ${BORDER}`, flexShrink:0 }} />
                        : <div style={{ width:34, height:34, borderRadius:6, background:'#E8F5F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:GREEN, flexShrink:0 }}>{(f.Name||'?')[0]}</div>}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:500, color:'#111', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.Name}</div>
                        <div style={{ fontSize:11, color:GREEN, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.Type}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Back link + sign out */}
          <div style={{ marginTop:48, paddingTop:28, borderTop:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <Link href="/" style={{ fontSize:13, color:'#888', textDecoration:'none' }}>← Back to directory</Link>
            <button
              onClick={async () => { await signOut(); router.push('/'); }}
              style={{ fontSize:13, padding:'8px 20px', borderRadius:4, background:'#fff', color:'#c0392b', border:'1px solid #f5c6c2', cursor:'pointer', fontFamily:FONT_BODY, fontWeight:500 }}
            >
              Sign out
            </button>
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
