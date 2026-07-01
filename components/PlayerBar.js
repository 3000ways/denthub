import { usePlayer } from '../lib/player-context';

const GREEN = '#0F6E56';
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

function fmt(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const { currentEpisode, isPlaying, position, duration, percent, pause, resume, seek } = usePlayer();

  if (!currentEpisode) return null;

  function handleScrub(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      boxShadow: '0 -2px 16px rgba(0,0,0,0.07)',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      fontFamily: FONT_BODY,
    }}>

      {/* Artwork */}
      {currentEpisode.image ? (
        <img
          src={currentEpisode.image}
          alt=""
          style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f0ede8', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#ccc' }}>
          🎙
        </div>
      )}

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
