import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBookmarks } from '../lib/bookmarks-context';
import { usePlayer } from '../lib/player-context';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

function FeedCard({ item }) {
  const [imgErr, setImgErr] = useState(false);
  const isVideo = item.type === 'video';
  const accent = isVideo ? '#e52d27' : GREEN;
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();

  // Compare by audio_url since bookmark feed items have no Supabase id yet
  const isActive = !isVideo && !!(currentEpisode && currentEpisode.audio_url === item.url);

  async function handlePodcastPlay(e) {
    e.preventDefault();
    if (isActive) { isPlaying ? pause() : resume(); return; }

    let epData = {
      audio_url: item.url,
      show_name: item.show,
      show_resource_id: item.resourceId,
      title: item.title,
      image: item.image,
      guid: item.url, // use audio URL as guid fallback
    };

    // Upsert to Supabase so progress tracking works immediately
    try {
      const res = await fetch('/api/upsert-episode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guid: epData.guid,
          show_resource_id: epData.show_resource_id,
          show_name: epData.show_name,
          title: epData.title,
          audio_url: epData.audio_url,
          image: epData.image,
        }),
      });
      if (res.ok) { const { id } = await res.json(); epData = { ...epData, id }; }
    } catch {}

    play(epData);
  }

  // YouTube — keep as external link
  if (isVideo) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer"
        style={{ display:'block', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden', textDecoration:'none', color:'inherit', transition:'box-shadow 0.15s, transform 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
        <div style={{ position:'relative', width:'100%', paddingBottom:'56.25%', background:'#f0ede8', overflow:'hidden' }}>
          {item.image && !imgErr ? (
            <img src={item.image} alt={item.title} onError={() => setImgErr(true)}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}>
              <span style={{ fontSize:28, color:'#ccc' }}>▶</span>
            </div>
          )}
          <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:accent, padding:'3px 7px', borderRadius:3 }}>Video</div>
        </div>
        <div style={{ padding:'12px 14px 14px' }}>
          <div style={{ fontSize:10, color:accent, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.show}</div>
          <div style={{ fontSize:13, fontWeight:600, color:'#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
          {item.date && <div style={{ fontSize:10, color:'#ccc' }}>{item.date}</div>}
        </div>
      </a>
    );
  }

  // Podcast — image plays, text navigates to resource page
  return (
    <div style={{ display:'block', background: isActive ? '#f0faf6' : '#fff', border:`1px solid ${isActive ? GREEN : BORDER}`,
        borderRadius:8, overflow:'hidden', transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>

      {/* Square artwork — clicking plays */}
      <div onClick={handlePodcastPlay} style={{ position:'relative', width:'100%', paddingBottom:'100%', background:'#f0ede8', overflow:'hidden', cursor:'pointer' }}>
        {item.image && !imgErr ? (
          <img src={item.image} alt={item.title} onError={() => setImgErr(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}>
            <span style={{ fontSize:28, color:'#ccc' }}>🎙</span>
          </div>
        )}
        <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:GREEN, padding:'3px 7px', borderRadius:3 }}>Podcast</div>
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
      </div>

      {/* Text — clicking opens the episode page (falls back to the show page) */}
      <Link href={item.episodeId ? `/episode/${item.episodeId}` : `/resource/${item.resourceId}`} style={{ display:'block', padding:'12px 14px 14px', textDecoration:'none', color:'inherit' }}>
        <div style={{ fontSize:10, color:accent, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.show}</div>
        <div style={{ fontSize:13, fontWeight:600, color: isActive ? GREEN : '#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          {item.date && <div style={{ fontSize:10, color:'#ccc' }}>{item.date}</div>}
          <div style={{ fontSize:10, color: isActive ? GREEN : '#aaa', fontWeight:600 }}>
            {isActive && isPlaying ? '▶ Playing' : isActive ? 'Paused' : '▶ Play'}
          </div>
        </div>
      </Link>
    </div>
  );
}

// "New from your bookmarks" — latest episodes/videos from the podcasts and
// YouTube channels the signed-in user has bookmarked. Renders nothing if the
// user follows no shows or none have fresh episodes.
export function BookmarkFeed({ isMobile = false, limit = 4 }) {
  const { bookmarkIds, loaded } = useBookmarks();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const idsKey = [...bookmarkIds].sort().join(',');

  useEffect(() => {
    if (!loaded) return;
    if (bookmarkIds.size === 0) { setEpisodes([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    fetch(`/api/bookmark-feed?ids=${encodeURIComponent(idsKey)}`)
      .then(r => r.json())
      .then(data => { if (active) setEpisodes(data.episodes || []); })
      .catch(() => { if (active) setEpisodes([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idsKey, loaded]);

  if (!loaded || loading || episodes.length === 0) return null;

  return (
    <div style={{ marginBottom:28, background:'rgba(255,255,255,0.55)', borderRadius:12, padding:'28px 28px 24px', border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)', fontFamily:FONT_BODY }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:24, paddingBottom:14, borderBottom:`2px solid #111` }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#111', fontFamily:FONT_DISPLAY, letterSpacing:-0.4 }}>New from your bookmarks</div>
        <div style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#bbb', fontWeight:600 }}>Latest from shows you follow</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap:12 }}>
        {episodes.slice(0, limit).map((ep, i) => <FeedCard key={`${ep.resourceId}-${i}`} item={ep} />)}
      </div>
    </div>
  );
}
