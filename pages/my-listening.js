import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { usePlayer } from '../lib/player-context';
import { supabase } from '../lib/supabase';

const GREEN = '#0F6E56';
const GREEN_LIGHT = '#E8F5F0';
const BORDER = '#e8e8e8';
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

function fmt(secs) {
  if (!secs || isNaN(secs)) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyListening() {
  const { user, signInWithGoogle } = useAuth();
  const { play, pause, resume, isPlaying, currentEpisode, deleteProgress, completedIds } = usePlayer();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'completed' | 'in-progress'

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchHistory();
  }, [user]);

  async function fetchHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('listening_progress')
      .select(`
        id, position_seconds, duration_seconds, completed, completed_at, listened_at,
        episodes ( id, title, show_name, image, audio_url, duration_seconds, published_at, link, show_resource_id )
      `)
      .eq('user_id', user.id)
      .order('listened_at', { ascending: false });

    if (!error) setRows(data || []);
    setLoading(false);
  }

  async function handleDelete(row) {
    await deleteProgress(row.episodes.id);
    setRows(prev => prev.filter(r => r.id !== row.id));
  }

  function handlePlay(ep) {
    if (currentEpisode?.id === ep.id) {
      isPlaying ? pause() : resume();
    } else {
      play(ep);
    }
  }

  const filtered = rows.filter(r => {
    if (filter === 'completed') return r.completed;
    if (filter === 'in-progress') return !r.completed;
    return true;
  });

  const totalSeconds = rows.filter(r => r.completed).reduce((sum, r) => {
    return sum + (r.duration_seconds || r.episodes?.duration_seconds || 0);
  }, 0);

  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);

  return (
    <>
      <Head>
        <title>My Listening History — The Dental Commute</title>
      </Head>

      <div style={{ fontFamily: FONT_BODY, minHeight: '100vh',
        background: '#f5f2eb',
        backgroundImage: 'radial-gradient(#c2b89a 1px, transparent 1px)',
        backgroundSize: '22px 22px' }}>

        <div style={{ height: 3, background: GREEN }} />

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 28px 100px' }}>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '20px 0 18px', borderBottom: `1px solid ${BORDER}`, marginBottom: 40 }}>
            <Link href="/" style={{ flexShrink: 0 }}>
              <img src="/logo.png" alt="The Dental Commute" style={{ height: 44, width: 'auto', display: 'block' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <Link href="/about" style={{ fontSize: 13, color: '#111', textDecoration: 'none', fontWeight: 500 }}>About</Link>
              <Link href="/" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>← Back to directory</Link>
            </div>
          </div>

          {/* Page title */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 14, fontWeight: 500 }}>Your Account</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 700, color: '#111', lineHeight: 1.1, margin: '0 0 8px', letterSpacing: -1 }}>
              My Listening History
            </h1>
            <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
              Episodes you've played or marked as listened.
            </p>
          </div>

          {/* Not signed in */}
          {!user && !loading && (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🎙</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>Sign in to track your listening</div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
                Your history is saved to your account so it syncs across devices.
              </div>
              <button onClick={signInWithGoogle}
                style={{ padding: '10px 24px', background: GREEN, color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Sign in with Google
              </button>
            </div>
          )}

          {/* Signed in */}
          {user && (
            <>
              {/* Stats */}
              {!loading && rows.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                  <div style={{ background: GREEN_LIGHT, borderRadius: 8, padding: '14px 20px', minWidth: 120 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, fontFamily: FONT_DISPLAY }}>
                      {rows.filter(r => r.completed).length}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Episodes listened</div>
                  </div>
                  <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '14px 20px', minWidth: 120 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>
                      {rows.filter(r => !r.completed).length}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>In progress</div>
                  </div>
                  {totalSeconds > 0 && (
                    <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '14px 20px', minWidth: 120 }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#111', fontFamily: FONT_DISPLAY }}>
                        {totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`}
                      </div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Total listened</div>
                    </div>
                  )}
                </div>
              )}

              {/* Filter tabs */}
              {!loading && rows.length > 0 && (
                <div style={{ display: 'flex', gap: 0, border: `1px solid ${BORDER}`, borderRadius: 6,
                  overflow: 'hidden', width: 'fit-content', marginBottom: 24 }}>
                  {[['all', 'All'], ['completed', '✓ Listened'], ['in-progress', 'In Progress']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                      style={{ fontSize: 12, padding: '8px 16px', border: 'none', cursor: 'pointer',
                        background: filter === val ? GREEN : '#fff',
                        color: filter === val ? '#fff' : '#666',
                        borderRight: val !== 'in-progress' ? `1px solid ${BORDER}` : 'none',
                        fontFamily: FONT_BODY, fontWeight: 500 }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div style={{ padding: '60px 0', textAlign: 'center', color: '#ccc', fontSize: 14 }}>Loading…</div>
              )}

              {!loading && rows.length === 0 && (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>🎧</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>No history yet</div>
                  <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
                    Start playing episodes and they'll show up here.
                  </div>
                  <Link href="/" style={{ fontSize: 14, color: GREEN, fontWeight: 600, textDecoration: 'none' }}>
                    Browse episodes →
                  </Link>
                </div>
              )}

              {!loading && filtered.length === 0 && rows.length > 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#bbb', fontSize: 14 }}>
                  No episodes in this filter.
                </div>
              )}

              {/* Episode list */}
              {!loading && filtered.map(row => {
                const ep = row.episodes;
                if (!ep) return null;
                const isActive = currentEpisode?.id === ep.id;
                const progressPct = row.duration_seconds > 0
                  ? Math.min(1, row.position_seconds / row.duration_seconds)
                  : 0;

                return (
                  <div key={row.id} style={{ display: 'flex', gap: 14, padding: '16px 0',
                    borderBottom: `1px solid ${BORDER}`, alignItems: 'flex-start' }}>

                    {/* Artwork */}
                    <div onClick={() => handlePlay(ep)}
                      style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden',
                        background: '#f0ede8', flexShrink: 0, cursor: 'pointer', position: 'relative' }}>
                      {ep.image ? (
                        <img src={ep.image} alt={ep.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 20, color: '#ccc' }}>🎙</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: GREEN, fontWeight: 600, letterSpacing: '0.06em',
                        textTransform: 'uppercase', marginBottom: 3 }}>{ep.show_name}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? GREEN : '#111',
                        lineHeight: 1.3, marginBottom: 6, fontFamily: FONT_DISPLAY,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {ep.title}
                      </div>

                      {/* Progress bar for in-progress */}
                      {!row.completed && progressPct > 0 && (
                        <div style={{ height: 3, background: '#eee', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${progressPct * 100}%`, height: '100%', background: GREEN, borderRadius: 2 }} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {row.completed ? (
                          <span style={{ fontSize: 10, color: GREEN, fontWeight: 600,
                            background: GREEN_LIGHT, borderRadius: 4, padding: '2px 6px' }}>
                            ✓ Listened {row.completed_at ? formatDate(row.completed_at) : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#aaa' }}>
                            {fmt(row.position_seconds)} of {fmt(row.duration_seconds || ep.duration_seconds)} listened
                          </span>
                        )}
                        <button onClick={() => handlePlay(ep)}
                          style={{ fontSize: 11, color: GREEN, fontWeight: 500,
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {isActive && isPlaying ? 'Pause' : isActive ? 'Resume' : row.completed ? 'Play again ▶' : 'Resume ▶'}
                        </button>
                        {ep.link && (
                          <a href={ep.link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#bbb', textDecoration: 'none' }}>Open →</a>
                        )}
                        <button onClick={() => handleDelete(row)}
                          style={{ fontSize: 11, color: '#ccc', background: 'none', border: 'none',
                            cursor: 'pointer', padding: 0, marginLeft: 'auto' }}
                          title="Remove from history">
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}

