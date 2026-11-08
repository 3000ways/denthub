// "Listen on" links for a Journal Briefings show: Apple and Spotify once Andrei
// has pasted the directory links in the admin, plus the RSS feed (copy to
// clipboard) for every other app.
import { useState } from 'react';

const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

export function SubscribeLinks({ show, compact = false }) {
  const [copied, setCopied] = useState(false);
  const feed = show.feed;
  const apple = show.row?.apple_url, spotify = show.row?.spotify_url;
  const pill = { fontSize: compact ? 12 : 13, fontWeight: 600, color: '#111', background: '#fff', textDecoration: 'none', padding: compact ? '7px 12px' : '9px 16px', borderRadius: 6, border: `1px solid ${BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' };
  async function copy() {
    try { await navigator.clipboard.writeText(feed); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { window.prompt('Copy the feed address:', feed); }
  }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {!compact && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6f6f6a', marginRight: 2 }}>Listen on</span>}
      {apple && <a href={apple} target="_blank" rel="noopener noreferrer" style={pill}> Apple Podcasts</a>}
      {spotify && <a href={spotify} target="_blank" rel="noopener noreferrer" style={pill}>Spotify</a>}
      <button onClick={copy} title={feed} style={{ ...pill, color: GREEN, borderColor: copied ? GREEN : BORDER }}>{copied ? '✓ Feed address copied' : 'RSS · any podcast app'}</button>
      {!apple && !spotify && !compact && <span style={{ fontSize: 12, color: '#6f6f6a' }}>Apple and Spotify listings are on their way. Paste the RSS address into any podcast app meanwhile.</span>}
    </div>
  );
}
