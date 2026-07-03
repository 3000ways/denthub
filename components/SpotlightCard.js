import { useState } from 'react';
import Link from 'next/link';
import { usePlayer } from '../lib/player-context';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';

// Vertical episode/video card (square artwork on top, text below). Used in the
// "What's New in Dentistry" spotlight and in the home-page discovery carousels.
// Extracted from pages/index.js so both surfaces render episodes identically.
//
// `item` shape: { type:'podcast'|'video', show, resourceId, title, url, image,
//                 date, description, guid }
export function SpotlightCard({ item }) {
  const [imgErr, setImgErr] = useState(false);
  const isVideo = item.type === 'video';
  const accentColor = isVideo ? '#e52d27' : GREEN;
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();
  const isActive = !isVideo && !!(currentEpisode && currentEpisode.audio_url === item.url);

  async function handlePodcastPlay(e) {
    e.preventDefault();
    if (isActive) { isPlaying ? pause() : resume(); return; }
    let epData = {
      audio_url:        item.url,
      show_name:        item.show,
      show_resource_id: item.resourceId,
      title:            item.title,
      image:            item.image,
      guid:             item.guid || item.url,
    };
    try {
      const res = await fetch('/api/upsert-episode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guid:             epData.guid,
          show_resource_id: epData.show_resource_id,
          show_name:        epData.show_name,
          title:            epData.title,
          audio_url:        epData.audio_url,
          image:            epData.image,
        }),
      });
      if (res.ok) { const { id } = await res.json(); epData = { ...epData, id }; }
    } catch {}
    play(epData);
  }

  // YouTube — external link
  if (isVideo) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer"
        style={{ display:'flex', flexDirection:'column', height:'100%', background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden', textDecoration:'none', color:'inherit', transition:'box-shadow 0.15s, transform 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
        <div style={{ position:'relative', width:'100%', paddingBottom:'56.25%', background:'#f0ede8', overflow:'hidden', flexShrink:0 }}>
          {item.image && !imgErr
            ? <img src={item.image} alt={item.title} onError={() => setImgErr(true)} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}><span style={{ fontSize:28, color:'#ccc' }}>▶</span></div>
          }
          <div style={{ position:'absolute', top:8, left:8, fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#fff', background:accentColor, padding:'3px 7px', borderRadius:3 }}>Video</div>
        </div>
        <div style={{ padding:'10px 10px 12px', flex:1 }}>
          <div style={{ fontSize:11, color:accentColor, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.show}</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
            display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
          {item.description && <div style={{ fontSize:12, color:'#999', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:8 }}>{item.description}</div>}
          <div style={{ fontSize:11, color:'#ccc' }}>{item.date}</div>
        </div>
      </a>
    );
  }

  // Podcast — image plays, text navigates to resource page
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background: isActive ? '#f0faf6' : '#fff', border:`1px solid ${isActive ? GREEN : BORDER}`,
        borderRadius:8, overflow:'hidden', transition:'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
      {/* Artwork — clicking plays */}
      <div onClick={handlePodcastPlay} style={{ position:'relative', width:'100%', paddingBottom:'100%', background:'#f0ede8', overflow:'hidden', cursor:'pointer', flexShrink:0 }}>
        {item.image && !imgErr
          ? <img src={item.image} alt={item.title} onError={() => setImgErr(true)} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
          : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#eceae4' }}><span style={{ fontSize:28, color:'#ccc' }}>🎙</span></div>
        }
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
      {/* Text — clicking navigates to resource page */}
      <Link href={`/resource/${item.resourceId}`} style={{ display:'flex', flexDirection:'column', flex:1, padding:'10px 10px 12px', textDecoration:'none', color:'inherit' }}>
        <div style={{ fontSize:11, color:accentColor, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>{item.show}</div>
        <div style={{ fontSize:14, fontWeight:600, color: isActive ? GREEN : '#111', lineHeight:1.3, marginBottom:6, fontFamily:FONT_DISPLAY,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{item.title}</div>
        {item.description && <div style={{ fontSize:12, color:'#999', lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:8 }}>{item.description}</div>}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto' }}>
          <div style={{ fontSize:11, color:'#ccc' }}>{item.date}</div>
          <div style={{ fontSize:10, color: isActive ? GREEN : '#aaa', fontWeight:600 }}>
            {isActive && isPlaying ? '▶ Playing' : isActive ? 'Paused' : '▶ Play'}
          </div>
        </div>
      </Link>
    </div>
  );
}
