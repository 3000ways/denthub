import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlayer } from '../lib/player-context';
import { EpisodeBookmarkButton } from './EpisodeBookmarkButton';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// A single episode row: artwork/play button, title (links to /episode/[id] when
// the episode is in our archive), date, listened badge, save + play actions.
// Extracted from pages/resource/[id].js so both the resource page's curated
// sections and the "All Episodes" browse/search section render episodes
// identically.
export function EpisodeCard({ ep, isNew, isFeatured, onSignInRequired }) {
  const { play, pause, resume, isPlaying, currentEpisode, completedIds } = usePlayer();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  // Guard: currentEpisode must be non-null. Compare by id when available,
  // fall back to audio_url so un-archived episodes don't all match (undefined === undefined).
  const isActive = !!(currentEpisode && (
    (ep.id && currentEpisode.id && ep.id === currentEpisode.id) ||
    (!ep.id && ep.audio_url && currentEpisode.audio_url === ep.audio_url)
  ));
  const isListened = ep.id && completedIds?.has(ep.id);

  async function handlePlay(e) {
    e.preventDefault();
    if (isActive) {
      isPlaying ? pause() : resume();
      return;
    }
    // If this episode isn't in our Supabase archive yet, upsert it now so
    // progress tracking works immediately without waiting for the nightly harvest.
    let enriched = ep;
    if (!ep.id && ep.guid && ep.show_resource_id && ep.audio_url) {
      try {
        const res = await fetch('/api/upsert-episode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guid:             ep.guid,
            show_resource_id: ep.show_resource_id,
            show_name:        ep.show_name,
            title:            ep.title,
            description:      ep.description,
            audio_url:        ep.audio_url,
            image:            ep.image,
            published_at:     ep.publishedAt,
            duration_seconds: ep.durationSeconds,
          }),
        });
        if (res.ok) {
          const { id } = await res.json();
          enriched = { ...ep, id };
        }
      } catch {}
    }
    play(enriched);
  }

  return (
    <div
      style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', background: '#fff',
        border: `1px solid ${isActive ? GREEN : BORDER}`, borderRadius: 8, padding: isMobile ? '8px 10px' : '10px 12px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = GREEN}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = BORDER; }}>

      {/* Artwork / play button */}
      <div onClick={handlePlay} style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
        {ep.image
          ? <img src={ep.image} alt={ep.title} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#ccc' }}>🎙</div>
        }
        <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: 'rgba(0,0,0,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: isActive ? 1 : 0, transition: 'opacity 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.opacity = '0'; }}>
          <span style={{ color: '#fff', fontSize: 14 }}>{isActive && isPlaying ? '⏸' : '▶'}</span>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {ep.id ? (
          <Link href={`/episode/${ep.id}`} title="View episode"
            style={{ fontSize: 13, fontWeight: 600, color: isActive ? GREEN : '#111', lineHeight: 1.3, marginBottom: 2, textDecoration: 'none',
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
            {ep.title}
          </Link>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? GREEN : '#111', lineHeight: 1.3, marginBottom: 2,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ep.title}
          </div>
        )}
        {ep.description && (
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {ep.description}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isFeatured && (
            <span title="Featured by the creator" style={{ color: '#7c3aed', fontWeight: 700, background: '#f3e8ff', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>
              ★ Featured
            </span>
          )}
          {isNew && <span style={{ color: GREEN, fontWeight: 600 }}>New</span>}
          {ep.date && <span style={{ whiteSpace: 'nowrap' }}>{ep.date}</span>}
          {isListened && (
            <span style={{ color: GREEN, fontWeight: 600, background: '#E8F5F0', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>
              ✓ Listened
            </span>
          )}
          {isActive && isPlaying && <span style={{ color: GREEN, fontWeight: 600 }}>▶ Playing</span>}
        </div>
      </div>

      {/* Save this episode */}
      {ep.id && (
        <EpisodeBookmarkButton episodeId={ep.id} onSignInRequired={onSignInRequired} />
      )}

      {/* Play / show-notes actions. Fixed width so the bookmark button to the
          left lines up across every row regardless of the label's length. The
          secondary link is "Show notes →" only when the episode has a real
          external page; archived rows without one just show Play (their title
          already links to the episode page), rather than an odd "Open → audio". */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0, width: 80 }}>
        <button onClick={handlePlay}
          style={{ fontSize: 11, color: GREEN, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
          {isActive && isPlaying ? 'Pause' : isActive ? 'Resume' : '▶ Play'}
        </button>
        {ep.link
          ? <a href={ep.link} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: '#ccc', textDecoration: 'none', whiteSpace: 'nowrap' }}>Show notes →</a>
          : (!ep.id && ep.audioUrl)
            ? <a href={ep.audioUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: '#ccc', textDecoration: 'none', whiteSpace: 'nowrap' }}>Open →</a>
            : null}
      </div>
    </div>
  );
}
