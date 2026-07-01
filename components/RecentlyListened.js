import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../lib/player-context';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';
const LIMIT  = 4;

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function RecentCard({ ep }) {
  const [imgErr, setImgErr] = useState(false);
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();
  const isActive = !!(currentEpisode && currentEpisode.audio_url === ep.audio_url);

  async function handlePlay(e) {
    e.preventDefault();
    if (isActive) { isPlaying ? pause() : resume(); return; }
    let epData = {
      id:               ep.episode_id,
      audio_url:        ep.audio_url,
      show_name:        ep.show_name,
      show_resource_id: ep.show_resource_id,
      title:            ep.title,
      image:            ep.image,
      guid:             ep.guid || ep.audio_url,
    };
    // Episode already in Supabase (we queried it from there), so no upsert needed
    play(epData);
  }

  const pct = ep.duration_seconds > 0
    ? Math.min(100, Math.round((ep.position_seconds / ep.duration_seconds) * 100))
    : 0;

  return (
    <div onClick={handlePlay}
      style={{ display:'block', background: isActive ? '#f0faf6' : '#fff',
        border:`1px solid ${isActive ? GREEN : BORDER}`,
        borderRadius:8, overflow:'hidden', cursor:'pointer',
        transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>

      {/* Square artwork */}
      <div style={{ position:'relative', width:'100%', paddingBottom:'100%', background:'#f0ede8', overflow:'hidden' }}>
        {ep.image && !imgErr
          ? <img src={ep.image} alt={ep.title} onError={() => setImgErr(true)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}>
              <span style={{ fontSize:28, color:'#ccc' }}>🎙</span>
            </div>
        }
        {/* Podcast badge */}
        <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:GREEN, padding:'3px 7px', borderRadius:3 }}>Podcast</div>
        {/* Play/pause overlay */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          background: isActive ? 'rgba(15,110,86,0.35)' : 'rgba(0,0,0,0.25)',
          opacity: isActive ? 1 : 0, transition:'opacity 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity='1'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.opacity='0'; }}>
          <div style={{ width:40, height:40, background:'rgba(255,255,255,0.92)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:GREEN, fontSize:14, marginLeft: isActive && isPlaying ? 0 : 2 }}>
              {isActive && isPlaying ? '⏸' : '▶'}
            </span>
          </div>
        </div>
        {/* Progress bar overlay at bottom of image */}
        {pct > 0 && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.3)' }}>
            <div style={{ width:`${pct}%`, height:'100%', background: ep.completed ? GREEN : '#fff' }} />
          </div>
        )}
      </div>

      <div style={{ padding:'10px 10px 12px' }}>
        <div style={{ fontSize:11, color:GREEN, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ep.show_name}</div>
        <div style={{ fontSize:14, fontWeight:600, color: isActive ? GREEN : '#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{ep.title}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:11, color:'#ccc' }}>{timeAgo(ep.listened_at)}</div>
          <div style={{ fontSize:10, color: ep.completed ? GREEN : '#aaa', fontWeight:600 }}>
            {ep.completed ? '✓ Done' : isActive && isPlaying ? '▶ Playing' : isActive ? 'Paused' : pct > 0 ? `${pct}%` : '▶ Play'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecentlyListened({ user, isMobile = false }) {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('listening_progress')
      .select(`
        id,
        episode_id,
        position_seconds,
        duration_seconds,
        completed,
        updated_at,
        episodes (
          id,
          title,
          show_name,
          show_resource_id,
          audio_url,
          image,
          guid
        )
      `)
      .eq('user_id', user.id)
      .order('listened_at', { ascending: false })
      .limit(LIMIT)
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        const mapped = data
          .filter(row => row.episodes)
          .map(row => ({
            episode_id:       row.episode_id,
            position_seconds: row.position_seconds,
            duration_seconds: row.duration_seconds,
            completed:        row.completed,
            listened_at:      row.listened_at,
            ...row.episodes,
          }));
        setEpisodes(mapped);
        setLoading(false);
      });
  }, [user?.id]);

  if (!user || loading || episodes.length === 0) return null;

  return (
    <div style={{ marginBottom:52, background:'rgba(255,255,255,0.55)', borderRadius:12,
      padding: isMobile ? '16px 10px 16px' : '28px 28px 24px',
      border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)', fontFamily:FONT_BODY }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:24, paddingBottom:14, borderBottom:`2px solid #111` }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.4 }}>Recently Listened</div>
        <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>Pick up where you left off</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 8 : 12 }}>
        {episodes.map((ep, i) => <RecentCard key={ep.episode_id || i} ep={ep} />)}
      </div>
    </div>
  );
}
