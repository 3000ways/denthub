import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { useBookmarks } from '../lib/bookmarks-context';

const GREEN = '#0F6E56';
const BORDER = '#e8e8e8';
const FONT = "'Inter', system-ui, -apple-system, sans-serif";

// Shared top nav used on every page.
// The green 3px bar lives inside the sticky container so it stays visible on scroll.
// All items use flexShrink:0 so nothing collapses or jumps between pages.
export default function SiteNav() {
  const { user, profile, signOut, signInWithGoogle } = useAuth();
  const { count: bookmarkCount } = useBookmarks();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(245,242,235,0.97)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Green accent bar — inside sticky so it's always visible */}
      <div style={{ height: 3, background: GREEN }} />

      <div style={{
        maxWidth: 1140, margin: '0 auto', padding: '0 28px',
        height: 53, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: FONT,
      }}>
        {/* Logo */}
        <Link href="/" style={{ flexShrink: 0 }}>
          <img src="/logo.png" alt="The Dental Commute" style={{ height: 40, width: 'auto', display: 'block' }} />
        </Link>

        {/* Right side — fixed-width items so they never shift position */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>

          {/* About */}
          <Link href="/about" style={{ fontSize: 13, color: '#777', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
            About
          </Link>

          {/* Saved — only when signed in */}
          {user && (
            <Link href="/saved" style={{ fontSize: 13, color: '#777', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Saved{bookmarkCount > 0 ? ` (${bookmarkCount})` : ''}
            </Link>
          )}

          {/* User avatar / dropdown  OR  Sign in button */}
          {user ? (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                title={profile?.full_name || user.email}
                onClick={() => setShowMenu(v => !v)}
                onBlur={() => setTimeout(() => setShowMenu(false), 150)}
                style={{ fontSize: 13, color: '#555', fontFamily: FONT, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
              >
                {(profile?.avatar_url || user.user_metadata?.avatar_url) ? (
                  <img
                    src={profile?.avatar_url || user.user_metadata?.avatar_url}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${BORDER}`, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {(profile?.full_name || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 13, color: '#555', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || profile?.role || user.email?.split('@')[0]}
                </span>
                {profile?.npi_verified && (
                  <span style={{ fontSize: 10, background: GREEN, color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>✓ Verified</span>
                )}
                <span style={{ fontSize: 10, color: '#ccc', flexShrink: 0 }}>▾</span>
              </button>

              {showMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 160, zIndex: 300, overflow: 'hidden' }}>
                  <Link href="/my-listening"
                    style={{ display: 'block', padding: '11px 16px', fontSize: 13, color: '#333', textDecoration: 'none', fontFamily: FONT, borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    🎧 My Listening
                  </Link>
                  <Link href="/saved"
                    style={{ display: 'block', padding: '11px 16px', fontSize: 13, color: '#333', textDecoration: 'none', fontFamily: FONT, borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    🔖 Saved resources
                  </Link>
                  <Link href="/profile"
                    style={{ display: 'block', padding: '11px 16px', fontSize: 13, color: '#333', textDecoration: 'none', fontFamily: FONT, borderBottom: `1px solid ${BORDER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    Profile settings
                  </Link>
                  <button
                    onClick={async () => { setShowMenu(false); await signOut(); window.location.href = '/'; }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13, color: '#c0392b', background: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              style={{ fontSize: 12, padding: '7px 16px', borderRadius: 4, background: '#fff', color: '#555', border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: FONT, fontWeight: 600, flexShrink: 0 }}>
              Sign in
            </button>
          )}

          {/* Submit a resource — links to home page submit modal */}
          <Link href="/?submit=1"
            style={{ fontSize: 12, padding: '7px 18px', borderRadius: 4, background: GREEN, color: '#fff', textDecoration: 'none', fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(15,110,86,0.25)', flexShrink: 0 }}>
            Submit a resource
          </Link>

        </div>
      </div>
    </div>
  );
}
