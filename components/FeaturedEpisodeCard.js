import { useState } from 'react';
import Link from 'next/link';
import { usePlayer } from '../lib/player-context';
import { EpisodeBookmarkButton } from './EpisodeBookmarkButton';
import { track } from '../lib/analytics';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN  = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED  = '#6f6f6a';

// Shared play/pause state for the hero's featured episode, so the card's Play
// button and the headline's "Start listening" button drive the same thing.
// `episode` is the /api/featured-episode shape (already archive-backed, so it
// carries an id and needs no upsert before playing).
export function useFeaturedPlayback(episode, pickKey = null) {
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();
  const isActive = !!(episode && currentEpisode && (
    (currentEpisode.id && episode.id && currentEpisode.id === episode.id) ||
    (currentEpisode.audio_url && currentEpisode.audio_url === episode.audio_url)
  ));
  function toggle(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!episode) return;
    if (isActive) { isPlaying ? pause() : resume(); return; }
    track('featured_play', { episode_id: episode.id, show: episode.show_name, show_id: episode.show_resource_id, specialty: pickKey || undefined });
    play({
      id:               episode.id,
      audio_url:        episode.audio_url,
      title:            episode.title,
      show_name:        episode.show_name,
      show_resource_id: episode.show_resource_id,
      image:            episode.image,
      guid:             episode.guid,
      duration_seconds: episode.duration_seconds,
    });
  }
  return { isActive, isPlaying: isActive && isPlaying, toggle };
}

function PlayIcon({ playing, size = 16 }) {
  return playing
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>;
}

// "Today's commute": the one playable episode in the home-page hero. Art,
// show, title, duration and a full-width Play. Renders a quiet placeholder of
// the same height until the API answers so the hero never jumps.
export function FeaturedEpisodeCard({ featured, loaded, playback, isMobile, onSignInRequired }) {
  const [imgErr, setImgErr] = useState(false);
  const ep = featured && featured.episode;
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();

  const cardStyle = {
    background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14,
    padding: isMobile ? 14 : 22, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, fontFamily: FONT_BODY,
  };

  if (!ep) {
    // Not loaded yet, or nothing fresh to feature: hold the space quietly.
    return (
      <div className="tdc-feat-ph" aria-hidden="true" style={{ ...cardStyle, background: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', color: MUTED, fontSize: 12 }}>
        {loaded ? 'Fresh episodes are loading into the archive.' : ''}
      </div>
    );
  }

  const artSize = isMobile ? 88 : 150;
  const show = ep.show || {};
  const meta = [ep.duration, show.rank ? `#${show.rank} podcast` : null, ep.date].filter(Boolean);

  function playUpNext(item, e) {
    e.preventDefault();
    const active = currentEpisode && ((currentEpisode.id && currentEpisode.id === item.id) || currentEpisode.audio_url === item.audio_url);
    if (active) { isPlaying ? pause() : resume(); return; }
    play({ id: item.id, audio_url: item.audio_url, title: item.title, show_name: item.show_name, show_resource_id: item.show_resource_id, image: item.image, guid: item.guid, duration_seconds: item.duration_seconds });
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, fontWeight: 700 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, display: 'inline-block', animation: playback.isPlaying ? 'tdcPulse 1.4s ease-in-out infinite' : 'none' }} />
          Today&rsquo;s commute
          <style>{`@keyframes tdcPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}`}</style>
        </div>
        {featured.pick && <span style={{ fontSize: 11, fontWeight: 600, color: GREEN, background: '#E8F5F0', borderRadius: 10, padding: '2px 8px' }}>For your specialty</span>}
      </div>

      <div style={{ display: 'flex', gap: isMobile ? 12 : 18, alignItems: 'flex-start' }}>
        <Link href={`/episode/${ep.id}`} aria-label={`Open ${ep.title}`} style={{ flexShrink: 0 }}>
          {ep.image && !imgErr
            ? <img src={ep.image} alt="" onError={() => setImgErr(true)} style={{ width: artSize, height: artSize, borderRadius: 10, objectFit: 'cover', display: 'block', background: '#f0ede8' }} />
            : <div style={{ width: artSize, height: artSize, borderRadius: 10, background: '#1E3A34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E8DCC0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: artSize * 0.28 }}>{(show.name || '?').slice(0, 1)}</div>}
        </Link>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link href={`/resource/${show.id}`} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, fontWeight: 700, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {show.name}{!isMobile && show.host ? ` · ${show.host}` : ''}
          </Link>
          <Link href={`/episode/${ep.id}`} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: isMobile ? 17 : 22, lineHeight: 1.2, color: '#111', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: isMobile ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {ep.title}
          </Link>
          {!isMobile && ep.description && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#4F4F4A', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ep.description}</p>
          )}
          {meta.length > 0 && (
            <div style={{ fontSize: 12, color: MUTED, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {meta.map((m, i) => (
                <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <span style={i === 0 && ep.duration ? { fontWeight: 600, color: '#111' } : undefined}>{m}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={playback.toggle}
          style={{ flex: 1, height: 48, border: 'none', borderRadius: 10, background: GREEN, color: '#fff', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <PlayIcon playing={playback.isPlaying} />
          {playback.isPlaying ? 'Pause' : playback.isActive ? 'Resume' : 'Play episode'}
        </button>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <EpisodeBookmarkButton episodeId={ep.id} onSignInRequired={onSignInRequired} variant="labeled" />
        </div>
      </div>

      {!isMobile && Array.isArray(featured.upNext) && featured.upNext.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, fontWeight: 700, marginBottom: 2 }}>Up next</div>
          {featured.upNext.map(item => (
            <button key={item.id} onClick={e => playUpNext(item, e)} title={`Play ${item.title}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', textAlign: 'left', fontFamily: FONT_BODY, color: '#111', width: '100%' }}>
              {item.image
                ? <img src={item.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 6, background: '#E8F5F0', flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong style={{ fontWeight: 600 }}>{item.title}</strong>
                <span style={{ color: MUTED }}> · {item.show_name}</span>
              </span>
              {item.duration && <span style={{ color: MUTED, flexShrink: 0 }}>{item.duration}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
