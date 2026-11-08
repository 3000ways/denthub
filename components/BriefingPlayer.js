// Journal Briefings — shared play controls for the episode page, the show page
// and the home row. Hands the player an episode object that already carries
// its chapters, so Next/Previous paper work immediately.
import { usePlayer } from '../lib/player-context';

const GREEN = '#0F6E56';

// The shape the global player wants, built from a published briefing + its show.
export function briefingEpisode(b, show) {
  return {
    id: b.episode_id || null,
    title: b.title,
    show_name: show.show,
    show_resource_id: show.row?.resource_id || null,
    audio_url: b.audio_url,
    image: show.artwork,
    duration_seconds: b.duration_seconds || null,
    guid: `tdc:briefing:${b.id}`,
    chapters: Array.isArray(b.chapters) && b.chapters.length > 1 ? b.chapters : null,
  };
}

export function useBriefingPlayback(ep) {
  const { play, pause, resume, seek, isPlaying, currentEpisode } = usePlayer();
  const isActive = !!(currentEpisode && ep && currentEpisode.audio_url === ep.audio_url);
  const toggle = () => { if (isActive) { isPlaying ? pause() : resume(); } else play(ep); };
  // Jump to a chapter: start playback if needed, then seek once the source is loaded.
  const playAt = (seconds) => {
    if (isActive) { seek(seconds); if (!isPlaying) resume(); return; }
    play(ep);
    setTimeout(() => seek(seconds), 400);
  };
  return { isActive, isPlaying: isActive && isPlaying, toggle, playAt };
}

export function PlayPill({ ep, size = 'md', label }) {
  const { isActive, isPlaying, toggle } = useBriefingPlayback(ep);
  const text = label || (isActive && isPlaying ? '❚❚ Pause' : isActive ? '▶ Resume' : '▶ Play episode');
  const pad = size === 'sm' ? '7px 14px' : '11px 22px';
  return (
    <button onClick={toggle} style={{ fontSize: size === 'sm' ? 12 : 14, fontWeight: 600, color: '#fff', background: GREEN, border: 'none', padding: pad, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      {text}
    </button>
  );
}

export const fmtDur = secs => { if (!secs) return null; const m = Math.round(secs / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
export const fmtDate = iso => { if (!iso) return null; const d = new Date(iso); return isNaN(d) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); };
export const fmtClock = secs => { const s = Math.max(0, Math.round(secs || 0)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };
