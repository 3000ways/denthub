import { useState, useEffect } from 'react';
import { useBookmarks } from '../lib/bookmarks-context';

const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

function FeedCard({ item }) {
  const [imgErr, setImgErr] = useState(false);
  const isVideo = item.type === 'video';
  const accent = isVideo ? '#e52d27' : GREEN;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      style={{ display:'block', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden', textDecoration:'none', color:'inherit', transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
      <div style={{ position:'relative', width:'100%', paddingBottom: isVideo ? '56.25%' : '100%', background:'#f0ede8', overflow:'hidden' }}>
        {item.image && !imgErr ? (
          <img src={item.image} alt={item.title} onError={() => setImgErr(true)}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}>
            <span style={{ fontSize:28, color:'#ccc' }}>{isVideo ? '▶' : '🎙'}</span>
          </div>
        )}
        <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:accent, padding:'3px 7px', borderRadius:3 }}>
          {isVideo ? 'Video' : 'Podcast'}
        </div>
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
    <div style={{ marginBottom:52, background:'rgba(255,255,255,0.55)', borderRadius:12, padding:'28px 28px 24px', border:`1px solid ${BORDER}`, boxShadow:'0 1px 6px rgba(0,0,0,0.04)', fontFamily:FONT_BODY }}>
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
