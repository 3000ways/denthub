import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Ribbon/bookmark icon — filled when saved, outline when not.
function Ribbon({ saved, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={saved ? GREEN : 'none'} stroke={saved ? GREEN : '#bbb'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Bookmark toggle. Login-required: when signed out, clicking opens the sign-in
// modal via onSignInRequired (same flow as voting/commenting).
//   variant="icon"    → bare icon button (for compact list rows)
//   variant="labeled" → icon + label pill (for detail pages)
//   kind="follow"     → labels read "Follow"/"Following" (for shows); else "Save"/"Saved"
export function BookmarkButton({ resourceId, onSignInRequired, variant = 'icon', size = 18, kind = 'save' }) {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [busy, setBusy] = useState(false);
  const saved = isBookmarked(resourceId);
  const onLabel  = kind === 'follow' ? 'Following' : 'Saved';
  const offLabel = kind === 'follow' ? 'Follow' : 'Save';

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { onSignInRequired?.(); return; }
    if (busy) return;
    setBusy(true);
    await toggleBookmark(resourceId);
    setBusy(false);
  }

  if (variant === 'labeled') {
    return (
      <button onClick={handleClick} disabled={busy} title={saved ? `${onLabel} — tap to remove` : offLabel}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px',
          borderRadius: 6, border: `1px solid ${saved ? GREEN : BORDER}`,
          background: saved ? '#E8F5F0' : '#fff', color: saved ? GREEN : '#555',
          cursor: busy ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
          fontFamily: FONT, transition: 'all 0.15s',
        }}>
        <Ribbon saved={saved} size={16} />
        {saved ? onLabel : offLabel}
      </button>
    );
  }

  return (
    <button onClick={handleClick} disabled={busy}
      title={saved ? 'Remove from saved' : 'Save for later'}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 6, border: 'none', background: 'none',
        cursor: busy ? 'default' : 'pointer', flexShrink: 0, padding: 0,
        opacity: busy ? 0.5 : 1, transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { if (!saved) e.currentTarget.firstChild.querySelector('path').setAttribute('stroke', GREEN); }}
      onMouseLeave={e => { if (!saved) e.currentTarget.firstChild.querySelector('path').setAttribute('stroke', '#bbb'); }}>
      <Ribbon saved={saved} size={size} />
    </button>
  );
}
