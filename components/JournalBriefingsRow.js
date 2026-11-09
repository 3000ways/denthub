// Home page row: the newest episode of every Journal Briefings show. Renders
// nothing until a show has published (so the home never shows an empty shelf).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePlayer } from '../lib/player-context';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const MUTED = '#6f6f6a';

export function JournalBriefingsRow({ isMobile }) {
  const [shows, setShows] = useState(null);
  const { play, pause, resume, isPlaying, currentEpisode } = usePlayer();
  useEffect(() => {
    let alive = true;
    fetch('/api/briefings/latest').then(r => r.json()).then(d => { if (alive) setShows((d.shows || []).filter(s => s.latest && s.latest.audio_url)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!shows || !shows.length) return null;
  const toEpisode = s => ({
    id: s.latest.episode?.id || null, title: s.latest.title, show_name: s.show, show_resource_id: s.latest.episode?.show_resource_id || null,
    audio_url: s.latest.audio_url, image: s.artwork, duration_seconds: s.latest.duration_seconds, guid: `tdc:briefing:${s.latest.briefing_id}`,
  });
  return (
    <section style={{ marginBottom: isMobile ? 34 : 48 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Journal Briefings · new every Monday</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: 0, color: '#111', letterSpacing: -0.3 }}>This week in the journals</h2>
        </div>
        <Link href="/journals" style={{ fontSize: 13, color: GREEN, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>All shows →</Link>
      </div>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory' }}>
        {shows.map(s => {
          const ep = toEpisode(s);
          const active = currentEpisode && currentEpisode.audio_url === ep.audio_url;
          const mins = s.latest.duration_seconds ? `${Math.round(s.latest.duration_seconds / 60)} min` : null;
          const date = s.latest.published_at ? new Date(s.latest.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
          return (
            <div key={s.cluster} style={{ flex: '0 0 auto', width: isMobile ? 300 : 360, display: 'flex', gap: 14, background: '#fff', border: `1px solid ${active ? GREEN : BORDER}`, borderRadius: 12, padding: 12, scrollSnapAlign: 'start' }}>
              <Link href={s.url} style={{ flexShrink: 0 }}><img src={s.artworkPath || s.artwork} alt={s.show} style={{ width: 104, height: 104, borderRadius: 8, display: 'block' }} /></Link>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Link href={s.url} style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: 4 }}>{s.show}</Link>
                <Link href={s.latest.href} style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: '#111', lineHeight: 1.3, textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.latest.title}</Link>
                <div style={{ fontSize: 11, color: MUTED, margin: '4px 0 8px' }}>{[date, mins, 'AI-narrated'].filter(Boolean).join(' · ')}</div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => (active ? (isPlaying ? pause() : resume()) : play(ep))} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: GREEN, border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>{active && isPlaying ? '❚❚ Pause' : active ? '▶ Resume' : '▶ Play'}</button>
                  <Link href={s.latest.href} style={{ fontSize: 12, color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Papers →</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
