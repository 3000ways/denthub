import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useEpisodeBookmarks } from '../lib/episode-bookmarks-context';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Ribbon/bookmark icon — filled when saved (matches the show BookmarkButton).
function Ribbon({ saved, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={saved ? GREEN : 'none'} stroke={saved ? GREEN : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Save a single podcast episode (by its archive id) for later. Login-required:
// signed-out clicks call onSignInRequired. Shares state via the episode
// bookmarks context, so it stays in sync with the Saved page.
//   variant="icon"    → bare icon button (player)
//   variant="labeled" → icon + "Save"/"Saved" pill
export function EpisodeBookmarkButton({ episodeId, onSignInRequired, variant = 'icon', size = 16 }) {
  const { user } = useAuth();
  const { isEpisodeBookmarked, toggleEpisodeBookmark } = useEpisodeBookmarks();
  const [busy, setBusy] = useState(false);
  const saved = isEpisodeBookmarked(episodeId);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { onSignInRequired?.(); return; }
    if (busy || !episodeId) return;
    setBusy(true);
    await toggleEpisodeBookmark(episodeId);
    setBusy(false);
  }

  if (variant === 'labeled') {
    return (
      <button onClick={handleClick} disabled={busy} title={saved ? 'Saved episode — tap to remove' : 'Save this episode'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px',
          borderRadius: 6, border: `1px solid ${saved ? GREEN : BORDER}`,
          background: saved ? '#E8F5F0' : '#fff', color: saved ? GREEN : '#555',
          cursor: busy ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
          fontFamily: FONT, whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
        <Ribbon saved={saved} size={15} />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button onClick={handleClick} disabled={busy}
      title={saved ? 'Saved episode — tap to remove' : 'Save this episode'}
      aria-label={saved ? 'Remove saved episode' : 'Save this episode'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 30, borderRadius: 6, border: `1px solid ${saved ? GREEN : BORDER}`,
        background: saved ? '#E8F5F0' : '#fff', color: saved ? GREEN : '#888',
        cursor: busy ? 'default' : 'pointer', flexShrink: 0, padding: 0,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!saved) e.currentTarget.style.borderColor = GREEN; }}
      onMouseLeave={e => { if (!saved) e.currentTarget.style.borderColor = BORDER; }}>
      <Ribbon saved={saved} size={size} />
    </button>
  );
}
