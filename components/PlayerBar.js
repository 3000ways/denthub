import { useState, useEffect } from 'react';
import { usePlayer } from '../lib/player-context';

const GREEN = '#0F6E56';
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ART_SIZE = 150;
const BAR_HEIGHT = 72;

export default function PlayerBar() {
  const { currentEpisode, isPlaying, position, duration, percent, pause, resume, seek, markListened, completedIds } = usePlayer();
  const isListened = completedIds?.has(currentEpisode?.id);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 640); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!currentEpisode) return null;

  function handleScrub(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.09)',
        fontFamily: FONT_BODY,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Scrubber — full width at top of bar */}
        <div
          onClick={handleScrub}
          style={{ width: '100%', height: 3, background: '#e8e8e8', cursor: 'pointer', position: 'relative' }}>
          <div style={{ width: `${Math.min(100, percent * 100)}%`, height: '100%', background: GREEN }} />
        </div>

        {/* Top row: artwork + episode info + timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 4px' }}>
          {/* Small inline artwork */}
          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
            {currentEpisode.image
              ? <img src={currentEpisode.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#ccc' }}>🎙</div>
            }
          </div>

          {/* Show + title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: GREEN, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentEpisode.show_name || currentEpisode.podcast}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentEpisode.title}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#aaa' }}>{fmt(position)}</div>
            <div style={{ fontSize: 10, color: '#ccc' }}>{fmt(duration)}</div>
          </div>
        </div>

        {/* Bottom row: transport + mark as listened */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '4px 14px 10px' }}>
          <button
            onClick={() => seek(Math.max(0, position - 15))}
            title="Back 15 seconds"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, fontWeight: 600, padding: '4px 6px' }}>
            ↺15
          </button>

          <button
            onClick={() => isPlaying ? pause() : resume()}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: GREEN, border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => seek(Math.min(duration || Infinity, position + 15))}
            title="Forward 15 seconds"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, fontWeight: 600, padding: '4px 6px' }}>
            15↻
          </button>

          <button
            onClick={() => markListened(currentEpisode)}
            title={isListened ? 'Already marked as listened' : 'Mark as listened'}
            style={{
              background: isListened ? '#E8F5F0' : '#f0f0f0',
              border: `1px solid ${isListened ? GREEN : '#999'}`,
              borderRadius: 6, padding: '5px 10px', cursor: isListened ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 600, color: isListened ? GREEN : '#333',
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            }}>
            {isListened ? '✓ Listened' : '✓ Mark'}
          </button>
        </div>
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      boxShadow: '0 -2px 20px rgba(0,0,0,0.09)',
      height: BAR_HEIGHT,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      paddingLeft: ART_SIZE + 32,
      paddingRight: 24,
      fontFamily: FONT_BODY,
      overflow: 'visible',
    }}>

      {/* Artwork — floats above the bar */}
      <div style={{
        position: 'absolute',
        left: 20,
        bottom: 0,
        width: ART_SIZE,
        height: ART_SIZE,
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
      }}>
        {currentEpisode.image ? (
          <img src={currentEpisode.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#f0ede8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#ccc' }}>
            🎙
          </div>
        )}
      </div>

      {/* Episode info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: GREEN, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentEpisode.show_name || currentEpisode.podcast}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentEpisode.title}
        </div>
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => seek(Math.max(0, position - 15))}
          title="Back 15 seconds"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888',
            fontSize: 13, fontWeight: 600, padding: '4px 6px', lineHeight: 1 }}>
          ↺15
        </button>

        <button
          onClick={() => isPlaying ? pause() : resume()}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: GREEN, border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => seek(Math.min(duration || Infinity, position + 15))}
          title="Forward 15 seconds"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888',
            fontSize: 13, fontWeight: 600, padding: '4px 6px', lineHeight: 1 }}>
          15↻
        </button>
      </div>

      {/* Mark as Listened */}
      <button
        onClick={() => markListened(currentEpisode)}
        title={isListened ? 'Already marked as listened' : 'Mark as listened'}
        style={{
          flexShrink: 0,
          background: isListened ? '#E8F5F0' : '#f0f0f0',
          border: `1px solid ${isListened ? GREEN : '#999'}`,
          borderRadius: 6, padding: '5px 10px', cursor: isListened ? 'default' : 'pointer',
          fontSize: 11, fontWeight: 600, color: isListened ? GREEN : '#333',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
        {isListened ? '✓ Listened' : '✓ Mark listened'}
      </button>

      {/* Scrubber + timestamps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 220, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#aaa', width: 32, textAlign: 'right', flexShrink: 0 }}>
          {fmt(position)}
        </span>

        <div
          onClick={handleScrub}
          style={{ flex: 1, height: 4, background: '#e8e8e8', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
          <div style={{ width: `${Math.min(100, percent * 100)}%`, height: '100%', background: GREEN, borderRadius: 2 }} />
        </div>

        <span style={{ fontSize: 11, color: '#aaa', width: 32, flexShrink: 0 }}>
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}
