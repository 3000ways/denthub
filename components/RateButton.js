import { useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { useVotes } from '../lib/votes-context';

const FONT = "'Inter', sans-serif";
const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';

// Thumbs-up icon — filled when the user has marked the resource helpful.
function Thumb({ on, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={on ? GREEN : 'none'} stroke={on ? GREEN : 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M7 10v11" />
      <path d="M4 10h3v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
      <path d="M7 10l4-7a2 2 0 0 1 3 2l-1 5h4.5a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 18 21H7" />
    </svg>
  );
}

// Compact "mark as helpful" control that reads/writes the SAME votes the
// resource-page Community section uses (via the shared votes context), so the
// count and filled/unfilled state stay in sync wherever the button appears.
// Login-required: signed-out clicks open the sign-in modal, matching bookmarks.
//   variant="icon"    → bare thumb + count (for cards)
//   variant="labeled" → thumb + "Helpful" pill (for the player / detail pages)
export function RateButton({ resourceId, onSignInRequired, variant = 'icon', size = 15, grow = false }) {
  const { user } = useAuth();
  const { hasVoted, getCount, primeCount, toggleVote } = useVotes();
  const voted = hasVoted(resourceId);
  const count = getCount(resourceId);

  useEffect(() => { primeCount(resourceId); }, [resourceId, primeCount]);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { onSignInRequired?.(); return; }
    await toggleVote(resourceId);
  }

  if (variant === 'labeled') {
    return (
      <button onClick={handleClick} title={voted ? 'You found this helpful — tap to undo' : 'Mark as helpful'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
          borderRadius: 6, border: `1px solid ${voted ? GREEN : BORDER}`,
          background: voted ? '#E8F5F0' : '#fff', color: voted ? GREEN : '#555',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT,
          whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}>
        <Thumb on={voted} size={15} />
        Helpful
        {count > 0 && <span style={{ color: voted ? GREEN : '#999', fontWeight: 600 }}>{count}</span>}
      </button>
    );
  }

  // Compact icon + count, for resource cards.
  return (
    <button onClick={handleClick}
      title={voted ? 'You found this helpful — tap to undo' : 'Mark as helpful'}
      aria-label={voted ? 'Marked as helpful' : 'Mark as helpful'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        flex: grow ? 1 : 'none', minWidth: 34, height: 30, padding: '0 10px', borderRadius: 6,
        border: `1px solid ${voted ? GREEN : BORDER}`,
        background: voted ? '#E8F5F0' : '#fff', color: voted ? GREEN : '#888',
        cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: FONT, padding: 0,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!voted) e.currentTarget.style.borderColor = GREEN; }}
      onMouseLeave={e => { if (!voted) e.currentTarget.style.borderColor = BORDER; }}>
      <Thumb on={voted} size={size} />
      {count > 0 && count}
    </button>
  );
}
